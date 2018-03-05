import * as Stream from 'stream';
import { is, Header, MimeType, HttpStatus } from '@toba/utility';
import { log } from '@toba/logger';
import { Token, Config as AuthConfig } from '@toba/oauth';
import { google } from 'googleapis';
import { GoogleDrive } from './types';
// google-auth-library is included by `googleapis` and only needed directly
// for its type information
import { OAuth2Client } from 'google-auth-library';

interface GenerateAuthUrlOpts {
   response_type?: string;
   client_id?: string;
   redirect_uri?: string;
   scope?: string[] | string;
}

export interface ClientConfig {
   apiKey: string;
   folderID: string;
   auth: AuthConfig;
   scope?: Scope | Scope[];
}

/**
 * Google access scopes.
 *
 * https://developers.google.com/drive/web/scopes
 */
export enum Scope {
   DriveReadWrite = 'https://www.googleapis.com/auth/drive',
   DriveReadOnly = 'https://www.googleapis.com/auth/drive.readonly',
   PhotoReadOnly = 'https://www.googleapis.com/auth/drive.photos.readonly'
}

/**
 * Set expiration a minute earlier than actual so refresh occurs before Google
 * blocks the request.
 */
export const minuteEarlier = (ms: number) => {
   const d = new Date(ms);
   d.setMinutes(d.getMinutes() - 1);
   return d;
};

export class GoogleDriveClient {
   config: ClientConfig;
   oauth: OAuth2Client;
   private _drive: GoogleDrive;

   constructor(config: ClientConfig) {
      this.config = config;
      this.oauth = new google.auth.OAuth2(
         config.auth.clientID,
         config.auth.secret,
         config.auth.callback
      );

      if (is.empty(this.config.scope)) {
         this.config.scope = Scope.DriveReadOnly;
      }
   }

   get drive() {
      if (this._drive === null) {
         this._drive = google.drive('v3');
      }
      return this._drive;
   }

   get token(): Token {
      return this.config.auth.token;
   }

   authorizationURL() {
      const scope = this.config.scope;

      return this.oauth.generateAuthUrl({
         access_type: 'offline', // gets refresh token
         approval_prompt: 'force', // gets refresh token every time
         scope
      } as GenerateAuthUrlOpts);
   }

   /**
    * Whether access token needs to be refreshed. True if a refresh token is
    * available and expiration is empty or old.
    */
   get accessTokenExpired() {
      return (
         is.value(this.token.refresh) &&
         (this.token.accessExpiration === null ||
            this.token.accessExpiration < new Date())
      );
   }

   /**
    * Refresh access token and proceed.
    *
    * https://developers.google.com/drive/v3/web/quickstart/nodejs
    */
   verifyToken() {
      this.oauth.credentials = {
         access_token: this.token.access,
         refresh_token: this.token.refresh
      };

      return new Promise((resolve, reject) => {
         if (this.accessTokenExpired) {
            this.oauth.refreshAccessToken((err: Error, tokens) => {
               if (is.value(err)) {
                  log.error(
                     'Unable to refresh Google access token: %s',
                     err.message
                  );
                  reject(err);
               } else {
                  //log.infoIcon('lock_outline', 'Refreshed Google access token');

                  this.oauth.credentials = tokens;

                  this.token.type = tokens.token_type;
                  this.token.access = tokens.access_token;
                  this.token.accessExpiration = minuteEarlier(
                     tokens.expiry_date
                  );

                  resolve();
               }
            });
         } else {
            resolve();
         }
      });
   }

   /**
    * Retrieve access and refresh tokens.
    */
   getAccessToken(code: string) {
      return new Promise<Token>((resolve, reject) => {
         this.oauth.getToken(code, (err: Error, token) => {
            if (is.value(err)) {
               reject(err);
            } else {
               this.oauth.credentials = token;
               // https://github.com/google/google-api-nodejs-client/issues/750#issuecomment-304521450
               resolve({
                  access: token.access_token,
                  refresh: token.refresh_token,
                  accessExpiration: minuteEarlier(token.expiry_date)
               } as Token);
            }
         });
      });
   }

   loadFile(fileName: string, stream: Stream.Writable): Promise<string> {
      return this.verifyToken().then((): Promise<string> => {
         const options = {
            auth: this.oauth,
            q: `name = '${fileName}.gpx' and '${
               this.config.folderID
            }' in parents`
         };

         this.drive.files.list(options, (err: any, res: any) => {
            // set flag so it isn't tried repeatedly
            //post.triedTrack = true;

            const files: any[] =
               is.defined(res, 'data') && is.defined(res.data, 'files')
                  ? res.data.files
                  : [];

            if (res.status != HttpStatus.OK) {
               // try HTTP errors again
               //post.triedTrack = false;
            } else if (err !== null) {
               throw `Error finding file for “${fileName}”: ${err.message}`;
            } else if (files.length == 0) {
               // no matches
               //post.hasTrack = false;
               throw `No file found for “${fileName}”`;
            } else {
               const file = files[0];
               // let purpose = 'Retrieving';
               // let icon = 'save';

               // if (is.value(stream)) {
               //    purpose = 'Downloading';
               //    icon = 'file_download';
               // }
               // log.infoIcon(
               //    icon,
               //    '%s GPX for “%s” (%s)',
               //    purpose,
               //    post.title,
               //    file.id
               // );
               return this.downloadFile(file.id, stream);
            }
         });
      });
   }

   /**
    * Google downloader uses Request module
    */
   downloadFile(fileId: string, stream?: Stream.Writable) {
      return this.verifyToken().then(() => {
         const options: googleAPIs.QueryOptions = {
            fileId,
            auth: this.oauth,
            alt: 'media',
            timeout: 10000
         };
         if (is.value(stream)) {
            // pipe to stream
            stream.on('finish', resolve);
            this.drive
               .files.get(options)
               .on('error', (err: any) => { throw err; })
               .on('end', () => {
                  //post.hasTrack = true;
               })
               .on('response', (res: any) => {
                  // response headers are piped directly to the stream so changes
                  // must happen here
                  res.headers[
                     Header.Content.Disposition.toLowerCase()
                  ] = `attachment; filename=${post.key}.gpx`;
                  res.headers[Header.Content.Type.toLowerCase()] =
                     MimeType.GPX;
               })
               .pipe(stream);
         } else {
            // capture file contents
            this.drive.files.get(options, (err: Error, res: any) => {
               if (is.value(err)) {
                  //reject(err);
               } else if (res.status != HttpStatus.OK) {
                  //reject('Server returned ' + res.status);
               } else if (is.defined(res, 'data')) {
                  //post.hasTrack = true;
                  //resolve(res.data);
               } else {
                  //reject('No data returned for file ' + fileId);
               }
            });
         }
      });
   )
}
