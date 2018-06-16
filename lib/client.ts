import { Writable } from 'stream';
import {
   is,
   merge,
   Header,
   HttpStatus,
   MimeType,
   EventEmitter,
   CompressCache,
   inferMimeType
} from '@toba/tools';
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

export enum EventType {
   RefreshTokenError,
   RefreshedAccessToken,
   FoundFile,
   FileNotFound
}

/**
 * @see http://google.github.io/google-api-nodejs-client/
 * @see https://github.com/google/google-api-nodejs-client/blob/master/samples/sampleclient.js#L35
 */
export class GoogleDriveClient {
   private config: GoogleConfig;
   private oauth: OAuth2Client;
   private cache: CompressCache;
   private _drive: drive_v3.Drive;
   events: EventEmitter<EventType, any>;

   constructor(config: GoogleConfig) {
      this.config = merge(config, defaultConfig as GoogleConfig);
      this.oauth = new google.auth.OAuth2(
         config.auth.clientID,
         config.auth.secret,
         config.auth.callback
      );
      this._drive = null;
      this.events = new EventEmitter<EventType, any>();

      if (this.config.useCache) {
         // assign method that will load file content not found in cache
         this.cache = new CompressCache(this.getFileWithName.bind(this), {
            maxBytes: this.config.cacheSize
         });
      }

      if (is.value<Token>(config.auth.token)) {
         this.oauth.setCredentials({
            access_token: config.auth.token.access,
            refresh_token: config.auth.token.refresh
         });
      }

      google.options({ auth: this.oauth });
   }

   /**
    * Google's own drive client.
    */
   get drive(): drive_v3.Drive {
      if (this._drive === null) {
         this._drive = google.drive('v3');
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
    * Ensure the Google API has been authenticated and authorized.
    *
    * @see https://developers.google.com/identity/protocols/OAuth2WebServer#refresh
    * @see https://github.com/google/google-auth-library-nodejs#manually-refreshing-access-token
    */
   private async ensureAccess() {
      await this.oauth.getRequestMetadata();
      this.events.emit(EventType.RefreshedAccessToken);
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
                  reject(err);
               } else if (res.status != HttpStatus.OK) {
                  reject(
                     `Server returned HTTP status ${res.status} for [${
                        params.q
                     }]`
                  );
               } else if (
                  is.defined(res, 'data') &&
                  is.defined(res.data, 'files')
               ) {
                  resolve(res.data.files);
               } else {
                  reject(`No data returned for [${params.q}]`);
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
                  reject(err);
               } else if (res.status != HttpStatus.OK) {
                  reject(`Server returned HTTP status ${res.status}`);
               } else if (is.defined(res, 'data')) {
                  this.events.emit(EventType.FoundFile, fileName);
                  resolve(res.data as T);
               } else {
                  let msg = 'No data returned for file';
                  if (fileName != null) {
                     msg += ' ' + fileName;
                  }
                  reject(msg);
               }
            }
         );
      });
   }

   /**
    * Send file content directly to writable stream.
    *
    * @see https://developers.google.com/drive/api/v3/manage-downloads
    * @see https://github.com/google/google-api-nodejs-client/blob/master/samples/drive/download.js
    */
   async streamFile(fileId: string, fileName: string, stream: Writable) {
      return new Promise<any>(async (resolve, reject) => {
         stream.on('finish', resolve);

         const params: GetFileParams = {
            fileId,
            alt: ResponseAlt.Media
         };

         const file = await this.drive.files.get(params, {
            responseType: ResponseType.Stream
         });

         (file.data as NodeJS.ReadableStream)
            .on('error', (err: RequestError) => {
               reject(err);
            })
            .on('end', () => {
               this.events.emit(EventType.FoundFile, fileName);
            })
            .on('response', (res: any) => {
               // response headers are piped directly to the stream so changes
               // must happen here
               let mimeType = MimeType.Binary;

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
    * Retrieve text content of named file. If `stream` is supplied then content
    * will be piped to it rather than returned in `Promise`.
    *
    * @param stream Usually an instance of `ServerResponse`
    */
   async readFileWithName(
      fileName: string,
      stream?: Writable
   ): Promise<string> {
      return this.config.useCache && !is.value(stream)
         ? this.cache.getText(fileName)
         : this.getFileWithName(fileName, stream);
   }

   /**
    * Find file with name by creating query and retrieving with ID of first
    * matching item.
    */
   private async getFileWithName(
      fileName: string,
      stream?: Writable
   ): Promise<string> {
      await this.ensureAccess();

      const params: ListFilesParams = {
         q: `name = '${fileName}' and '${this.config.folderID}' in parents`,
         spaces: QuerySpace.Drive
      };

      const files = await this.getFileList(params);

      if (files.length == 0) {
         throw `File not found: “${fileName}”`;
      } else if (is.value(stream)) {
         return this.streamFile(files[0].id, fileName, stream);
      } else {
         return this.readFileWithID(files[0].id);
      }
   }

   /**
    * Download or stream file content. Note that Google downloader uses Request
    * module.
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

      const data = await this.getFileData<string>(params, fileName);

      if (this.config.useCache && fileName != null) {
         this.cache.addText(fileName, data);
      }
      return data;
   }
}
