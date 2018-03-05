//import { Post, Provider, Token } from '../types';
import * as Stream from 'stream';
import config from '../config';
import { header, mimeType, httpStatus } from '../constants';
import { is } from '@toba/utility';
import { log } from '@toba/logger';
import * as googleAPIs from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

interface GenerateAuthUrlOpts {
   response_type?: string;
   client_id?: string;
   redirect_uri?: string;
   scope?: string[] | string;
}

/**
 * Google access scopes
 *
 * https://developers.google.com/drive/web/scopes
 */
const scope = {
   drive: {
      READ_WRITE: 'https://www.googleapis.com/auth/drive',
      READ_ONLY: 'https://www.googleapis.com/auth/drive.readonly'
   },
   photo: {
      READ_ONLY: 'https://www.googleapis.com/auth/drive.photos.readonly'
   }
};

const authConfig = config.google.auth;
const authClient = new OAuth2Client(
   authConfig.clientID,
   authConfig.secret,
   authConfig.callback
);

const authorizationURL = () =>
   authClient.generateAuthUrl({
      access_type: 'offline', // gets refresh token
      approval_prompt: 'force', // gets refresh token every time
      scope: scope.drive.READ_ONLY
   } as GenerateAuthUrlOpts);

/**
 * Whether access token needs to be refreshed. True if a refresh token is
 * available and expiration is empty or old.
 */
const accessTokenExpired = () =>
   is.value(authConfig.token.refresh) &&
   (authConfig.token.accessExpiration === null ||
      authConfig.token.accessExpiration < new Date());

/**
 * Set expiration a minute earlier than actual so refresh occurs before Google
 * blocks the request.
 */
const minuteEarlier = (ms: number) => {
   const d = new Date(ms);
   d.setMinutes(d.getMinutes() - 1);
   return d;
};

/**
 * Refresh access token and proceed
 *
 * https://developers.google.com/drive/v3/web/quickstart/nodejs
 */
const verifyToken = () =>
   new Promise<null>((resolve, reject) => {
      authClient.credentials = {
         access_token: authConfig.token.access,
         refresh_token: authConfig.token.refresh
      };
      if (accessTokenExpired()) {
         authClient.refreshAccessToken((err: Error, tokens: any) => {
            if (is.value(err)) {
               log.error(
                  'Unable to refresh Google access token: %s',
                  err.message
               );
               reject(err);
            } else {
               log.infoIcon('lock_outline', 'Refreshed Google access token');

               authClient.credentials = tokens;

               authConfig.token.type = tokens.token_type;
               authConfig.token.access = tokens.access_token;
               authConfig.token.accessExpiration = minuteEarlier(
                  tokens.expiry_date
               );

               resolve();
            }
         });
      } else {
         resolve();
      }
   });

/**
 * Retrieve access and refresh tokens
 */
const getAccessToken = (code: string) =>
   new Promise<Token>((resolve, reject) => {
      authClient.getToken(code, (err: Error, token: any) => {
         if (is.value(err)) {
            reject(err);
         } else {
            authClient.credentials = token;
            resolve({
               access: token.access_token,
               refresh: token.refresh_token,
               accessExpiration: minuteEarlier(token.expiry_date)
            } as Token);
         }
      });
   });

const driveConfig = config.google.drive;
let _drive: googleAPIs.Drive = null;

function drive() {
   if (_drive === null) {
      _drive = googleAPIs.drive('v3');
   }
   return _drive;
}

const loadGPX = (post: Post, stream: Stream.Writable) =>
   verifyToken().then(
      () =>
         new Promise<string>((resolve, reject) => {
            const options = {
               auth: authClient,
               q: `name = '${post.title}.gpx' and '${
                  driveConfig.tracksFolder
               }' in parents`
            };

            drive().files.list(options, (err, res: any) => {
               // set flag so it isn't tried repeatedly
               post.triedTrack = true;

               const files: any[] =
                  is.defined(res, 'data') && is.defined(res.data, 'files')
                     ? res.data.files
                     : [];

               if (res.status != httpStatus.OK) {
                  // try HTTP errors again
                  post.triedTrack = false;
               } else if (err !== null) {
                  log.error(
                     'Error finding GPX for “%s”: %s',
                     post.title,
                     err.message
                  );
                  reject(err);
               } else if (files.length == 0) {
                  // no matches
                  post.hasTrack = false;
                  log.warn(`No GPX file found for “${post.title}”`);
                  reject();
               } else {
                  const file = files[0];
                  let purpose = 'Retrieving';
                  let icon = 'save';

                  if (is.value(stream)) {
                     purpose = 'Downloading';
                     icon = 'file_download';
                  }
                  log.infoIcon(
                     icon,
                     '%s GPX for “%s” (%s)',
                     purpose,
                     post.title,
                     file.id
                  );
                  resolve(downloadFile(file.id, post, stream));
               }
            });
         })
   );

/**
 * Google downloader uses Request module
 */
const downloadFile = (fileId: string, post: Post, stream: Stream.Writable) =>
   verifyToken().then(
      () =>
         new Promise<string>((resolve, reject) => {
            const options = {
               fileId,
               auth: authClient,
               alt: 'media',
               timeout: 10000
            };
            if (is.value(stream)) {
               // pipe to stream
               stream.on('finish', resolve);
               drive()
                  .files.get(options)
                  .on('error', reject)
                  .on('end', () => {
                     post.hasTrack = true;
                  })
                  .on('response', res => {
                     // response headers are piped directly to the stream so changes
                     // must happen here
                     res.headers[
                        header.content.DISPOSITION.toLowerCase()
                     ] = `attachment; filename=${post.key}.gpx`;
                     res.headers[header.content.TYPE.toLowerCase()] =
                        mimeType.GPX;
                  })
                  .pipe(stream);
            } else {
               // capture file contents
               drive().files.get(options, (err: Error, res: any) => {
                  if (is.value(err)) {
                     reject(err);
                  } else if (res.status != httpStatus.OK) {
                     reject('Server returned ' + res.status);
                  } else if (is.defined(res, 'data')) {
                     post.hasTrack = true;
                     resolve(res.data);
                  } else {
                     reject('No data returned for file ' + fileId);
                  }
               });
            }
         })
   );

export default {
   auth: {
      url: authorizationURL,
      client: authClient,
      verify: verifyToken,
      expired: accessTokenExpired,
      getAccessToken,
      isEmpty() {
         return is.empty(authConfig.token.access);
      }
   },
   drive: {
      loadGPX
   }
} as Provider.Google;
