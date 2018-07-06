import { Writable } from 'stream';
import {
   is,
   merge,
   HttpStatus,
   EventEmitter,
   CompressCache,
   CacheEventType,
   Encoding
} from '@toba/tools';
import { log } from '@toba/logger';
import { Token } from '@toba/oauth';
import { google, drive_v3 } from 'googleapis';
import {
   AccessType,
   AuthPrompt,
   GetFileResponse,
   GetFileListResponse,
   GenerateAuthUrlOpts,
   RequestError,
   ResponseAlt,
   ResponseType,
   DriveFile,
   ListFilesParams,
   GetFileParams,
   QuerySpace
} from './types';
// `google-auth-library` is included by `googleapis` and only needed for its
// type information. The version specified in local `package.json` must match
// the version in `node_modules/googleapis/package.json`.
import { OAuth2Client } from 'google-auth-library';
import { defaultConfig, GoogleConfig } from './config';
import { Unzip } from 'zlib';

export enum EventType {
   RefreshTokenError,
   RefreshedAccessToken,
   FoundFile,
   FileNotFound,
   CacheMiss
}

/**
 * @see http://google.github.io/google-api-nodejs-client/
 * @see https://github.com/google/google-api-nodejs-client/blob/master/samples/sampleclient.js#L35
 */
export class GoogleDriveClient {
   private config: GoogleConfig;
   private cache: CompressCache;
   private _drive: drive_v3.Drive;
   private oauth: OAuth2Client;
   events: EventEmitter<EventType, any>;

   constructor(config: GoogleConfig) {
      this.config = merge(config, defaultConfig);
      this.oauth = new google.auth.OAuth2(
         config.auth.clientID,
         config.auth.secret,
         config.auth.callback
      );
      this._drive = null;
      this.events = new EventEmitter<EventType, any>();

      if (this.config.useCache) {
         this.cache = new CompressCache(this.getFileWithName.bind(this), {
            maxBytes: this.config.cacheSize
         });
         // emit key not found as cache miss event
         this.cache.events.subscribe(
            CacheEventType.KeyNotFound,
            (key: string) => {
               this.events.emit(EventType.CacheMiss, key);
               this.logInfo(`File not found in cache`, { fileName: key });
            }
         );
      }

      if (is.value<Token>(config.auth.token)) {
         this.oauth.setCredentials({
            access_token: config.auth.token.access,
            refresh_token: config.auth.token.refresh
         });
      }

      google.options({ auth: this.oauth });

      this.logInfo('Created Google Drive client manager');
   }

   /**
    * Clear file cache.
    */
   clearCache(): void {
      if (this.config.useCache) {
         this.cache.clear();
      }
   }

   /**
    * Log information if logging is enabled.
    */
   private logInfo(msg: string | Error, data?: any) {
      if (!this.config.disableLogging) {
         log.info(msg, data);
      }
   }

   /**
    * Log error if logging is enabled.
    */
   private logError(msg: string | Error, data?: any) {
      if (!this.config.disableLogging) {
         log.error(msg, data);
      }
   }

   /**
    * Log error if logging is enabled and pass same message to Promise reject
    * method.
    */
   private logAndReject(
      reject: (msg: string | Error) => void,
      msg: string | Error,
      data?: any
   ) {
      this.logError(msg, data);
      reject(msg);
   }

   /**
    * Google's own drive client.
    */
   get drive(): drive_v3.Drive {
      if (this._drive === null) {
         this._drive = google.drive('v3');
         this.logInfo('Created Google Drive client');
      }
      return this._drive;
   }

   /**
    * Configured token object.
    */
   get token(): Token {
      return this.config.auth.token;
   }

   /**
    * Return URL that can be used to request an access token.
    *
    * @see http://google.github.io/google-api-nodejs-client/22.2.0/index.html#authorizing-and-authenticating
    * @see https://github.com/google/google-auth-library-nodejs#oauth2-client
    */
   get authorizationURL(): string {
      return this.oauth.generateAuthUrl({
         access_type: AccessType.Offline,
         prompt: AuthPrompt.Consent,
         scope: this.config.scope
      } as GenerateAuthUrlOpts);
   }

   /**
    * @param code Authorization code returned by initial authorization URL
    */
   async getAccessToken(code: string): Promise<Token> {
      const res = await this.oauth.getToken(code);
      return {
         access: res.tokens.access_token,
         accessExpiration: new Date(res.tokens.expiry_date),
         refresh: res.tokens.refresh_token
      } as Token;
   }

   /**
    * Ensure the Google API has been authenticated and authorized.
    *
    * @see https://developers.google.com/identity/protocols/OAuth2WebServer#refresh
    * @see https://github.com/google/google-auth-library-nodejs#manually-refreshing-access-token
    */
   private async ensureAccess() {
      await this.oauth.getRequestMetadata();
   }

   /**
    * List of files matching query parameter.
    *
    * @see https://developers.google.com/drive/v3/web/search-parameters
    */
   async getFileList(params: ListFilesParams) {
      await this.ensureAccess();
      return new Promise<DriveFile[]>((resolve, reject) => {
         this.drive.files.list(
            params,
            (err: RequestError, res: GetFileListResponse) => {
               if (is.value(err)) {
                  this.logAndReject(reject, err);
               } else if (res.status != HttpStatus.OK) {
                  this.logAndReject(
                     reject,
                     `Server returned HTTP status ${res.status} for [${
                        params.q
                     }]`,
                     { query: params.q }
                  );
               } else if (
                  is.defined(res, 'data') &&
                  is.defined(res.data, 'files')
               ) {
                  resolve(res.data.files);
               } else {
                  this.logAndReject(
                     reject,
                     `No data returned for [${params.q}]`,
                     { query: params.q }
                  );
               }
            }
         );
      });
   }

   /**
    * Get content of single file.
    *
    * @see https://developers.google.com/apis-explorer/?hl=en_US#p/drive/v3/drive.files.get
    */
   private async getFileData<T>(
      params: GetFileParams,
      fileName: string = null
   ) {
      await this.ensureAccess();
      return new Promise<T>((resolve, reject) => {
         this.drive.files.get(
            params,
            (err: RequestError, res: GetFileResponse<T>) => {
               if (is.value(err)) {
                  this.logAndReject(reject, err, { fileName });
               } else if (res.status != HttpStatus.OK) {
                  this.logAndReject(
                     reject,
                     `Server returned HTTP status ${res.status}`,
                     { fileName }
                  );
               } else if (is.defined(res, 'data')) {
                  this.events.emit(EventType.FoundFile, fileName);
                  resolve(res.data);
               } else {
                  let msg = 'No data returned for file';
                  if (fileName != null) {
                     msg += ' ' + fileName;
                  }
                  this.logAndReject(reject, msg, { fileName });
               }
            }
         );
      });
   }

   /**
    * Send file content directly to writable stream. Drive's `files.get()`
    * method returns `file.data` as a `zlib.Unzip` stream reader object
    * which means GZipped files will always be decompressed -- no way to pass
    * through a file and have it remain compressed.
    *
    * @see https://nodejs.org/api/zlib.html#zlib_class_zlib_unzip
    *
    * This is due to Drive's use of the Axios HTTP adapter which pipes to
    * `zlib.createUnzip()` for any compressed content encoding.
    *
    * @see https://github.com/axios/axios/blob/405fe690f93264d591b7a64d006314e2222c8727/lib/adapters/http.js#L160
    *
    * @see https://developers.google.com/drive/api/v3/manage-downloads
    * @see https://github.com/google/google-api-nodejs-client/blob/master/samples/drive/download.js
    */
   async streamFile(fileId: string, fileName: string, stream: Writable) {
      return new Promise<void>(async (resolve, reject) => {
         stream.on('finish', resolve);

         const params: GetFileParams = {
            fileId,
            alt: ResponseAlt.Media
         };

         const res = await this.drive.files.get(params, {
            responseType: ResponseType.Stream
         });

         (res.data as Unzip)
            .on('error', (err: RequestError) => {
               this.logAndReject(reject, err, { fileName });
            })
            .on('end', () => {
               this.events.emit(EventType.FoundFile, fileName);
            })
            .pipe(stream);
      });
   }

   /**
    * Retrieve text content of named file.
    */
   readFileWithName(fileName: string): Promise<string> {
      return this.config.useCache
         ? this.cache.getText(fileName)
         : this.getFileWithName(fileName);
   }

   async streamFileWithName(fileName: string, stream: Writable): Promise<void> {
      if (this.config.useCache) {
         const bytes = await this.cache.getZip(fileName);
         if (is.value<Buffer>(bytes)) {
            stream.write(bytes, Encoding.Buffer);
            return;
         }
      }
      const fileID: string = await this.getFileIdForName(fileName);
      return this.streamFile(fileID, fileName, stream);
   }

   /**
    * Get ID of first file having given name.
    */
   private async getFileIdForName(fileName: string): Promise<string> {
      await this.ensureAccess();

      const params: ListFilesParams = {
         q: `name = '${fileName}' and '${this.config.folderID}' in parents`,
         spaces: QuerySpace.Drive
      };

      const files = await this.getFileList(params);

      return files.length == 0 ? null : files[0].id;
   }

   /**
    * Find file with name by creating query and retrieving with ID of first
    * matching item.
    */
   private async getFileWithName(fileName: string): Promise<string> {
      const fileID: string = await this.getFileIdForName(fileName);

      if (fileID === null) {
         return Promise.reject(`File not found: “${fileName}”`);
      } else {
         return this.readFileWithID(fileID, fileName);
      }
   }

   /**
    * Download file content.
    *
    * @see https://developers.google.com/drive/v3/web/manage-downloads
    */
   async readFileWithID(fileId: string, fileName: string = null) {
      await this.ensureAccess();

      const params: GetFileParams = {
         fileId,
         alt: ResponseAlt.Media,
         timeout: 10000
      };

      const text = await this.getFileData<string>(params, fileName);

      if (this.config.useCache && fileName != null) {
         this.cache.addText(fileName, text);
      }
      return text;
   }
}
