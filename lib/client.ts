import * as Stream from 'stream';
import { is, Header, HttpStatus, inferMimeType } from '@toba/tools';
import { Token, Config as AuthConfig } from '@toba/oauth';
import { google } from 'googleapis';
import {
   GoogleDrive,
   Scope,
   GenerateAuthUrlOpts,
   DriveResponse,
   RequestConfig,
   RequestError,
   DriveFile,
   ListFilesParams,
   GetFileParams,
   QuerySpace
} from './types';
// google-auth-library is included by `googleapis` and only needed directly
// for its type information
import { OAuth2Client } from 'google-auth-library';

export interface ClientConfig {
   apiKey: string;
   folderID: string;
   auth: AuthConfig;
   scope?: Scope | Scope[];
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
   private config: ClientConfig;
   private oauth: OAuth2Client;
   private _drive: GoogleDrive;

   constructor(config: ClientConfig) {
      this.config = config;
      this.oauth = new google.auth.OAuth2(
         config.auth.clientID,
         config.auth.secret,
         config.auth.callback
      );
      this._drive = null;

      if (is.empty(this.config.scope)) {
         this.config.scope = Scope.DriveReadOnly;
      }
   }

   get drive() {
      if (this._drive === null) {
         this._drive = google.drive('v3') as GoogleDrive;
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

   get requestConfig(): RequestConfig {
      return {
         auth: this.oauth
      };
   }

   /**
    * Refresh access token as needed and proceed.
    *
    * https://developers.google.com/drive/v3/web/quickstart/nodejs
    */
   verifyToken(): Promise<any> {
      this.oauth.credentials = {
         access_token: this.token.access,
         refresh_token: this.token.refresh
      };

      if (!this.accessTokenExpired) {
         return Promise.resolve(null);
      }

      return new Promise<any>((resolve, reject) => {
         this.oauth.refreshAccessToken((err: Error, tokens) => {
            if (is.value(err)) {
               // log.error(
               //    'Unable to refresh Google access token: %s',
               //    err.message
               // );
               reject(err);
            } else {
               //log.infoIcon('lock_outline', 'Refreshed Google access token');

               this.oauth.credentials = tokens;

               this.token.type = tokens.token_type;
               this.token.access = tokens.access_token;
               this.token.accessExpiration = minuteEarlier(tokens.expiry_date);

               resolve();
            }
         });
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

   /**
    * List of files matching query parameter.
    *
    * https://developers.google.com/drive/v3/web/search-parameters
    */
   getFileList(
      params: ListFilesParams,
      config: RequestConfig = this.requestConfig
   ): Promise<DriveFile[]> {
      return new Promise((resolve, reject) => {
         this.drive.files.list(
            params,
            config,
            (err: RequestError, res: DriveResponse) => {
               if (is.value(err)) {
                  reject(err);
               } else if (res.status != HttpStatus.OK) {
                  reject('');
               } else if (
                  is.defined(res, 'data') &&
                  is.defined(res.data, 'files')
               ) {
                  resolve(res.data.files);
               } else {
                  reject('');
               }
            }
         );
      });
   }

   getFileData(
      params: GetFileParams,
      fileName: string = null,
      config: RequestConfig = this.requestConfig
   ): Promise<string> {
      return new Promise((resolve, reject) => {
         this.drive.files.get(params, config, (err: RequestError, res) => {
            if (is.value(err)) {
               reject(err);
            } else if (res.status != HttpStatus.OK) {
               //reject('Server returned ' + res.status);
            } else if (is.defined(res, 'data')) {
               //post.hasTrack = true;
               resolve(res.data);
            } else {
               let msg = 'No data returned for file';
               if (fileName != null) {
                  msg += ' ' + fileName;
               }
               reject(msg);
            }
         });
      });
   }

   /**
    * Send file content directly to writable stream.
    */
   streamFile(
      params: GetFileParams,
      stream: Stream.Writable,
      fileName: string = null,
      config: RequestConfig = this.requestConfig
   ): Promise<any> {
      return new Promise((resolve, reject) => {
         stream.on('finish', resolve);

         this.drive.files
            .get(params, config)
            .on('error', (err: RequestError) => {
               reject(err);
            })
            .on('end', () => {
               //post.hasTrack = true;
            })
            .on('response', (res: any) => {
               // response headers are piped directly to the stream so changes
               // must happen here
               let mimeType = 'application/octet-stream';

               if (fileName === null) {
                  fileName = new Date().toDateString();
               } else {
                  mimeType = inferMimeType(fileName);
               }

               res.headers[
                  Header.Content.Disposition.toLowerCase()
               ] = `attachment; filename=${fileName}`;
               res.headers[Header.Content.Type.toLowerCase()] = mimeType;
            })
            .pipe(stream);
      });
   }

   /**
    * Find file with name by creating query and retrieving with ID of first
    * matching item.
    */
   fileWithName(fileName: string, stream?: Stream.Writable): Promise<{}> {
      return this.verifyToken().then(() => {
         const params: ListFilesParams = {
            q: `name = '${fileName}' and '${this.config.folderID}' in parents`,
            spaces: QuerySpace.Drive
         };

         return this.getFileList(params).then(files => {
            if (files.length == 0) {
               //post.hasTrack = false;
               throw `File not found: “${fileName}”`;
            } else {
               const file = files[0];
               return this.fileWithID(file.id, stream);
            }
         });
      });
   }

   /**
    * Note that Google downloader uses Request module.
    *
    * https://developers.google.com/drive/v3/web/manage-downloads
    */
   fileWithID(
      fileId: string,
      stream?: Stream.Writable,
      fileName: string = null
   ): Promise<any> {
      return this.verifyToken().then(() => {
         const params: GetFileParams = {
            fileId,
            alt: 'media',
            timeout: 10000
         };

         if (is.value(stream)) {
            return this.streamFile(params, stream, fileName);
         } else {
            return this.getFileData(params, fileName);
         }
      });
   }
}
