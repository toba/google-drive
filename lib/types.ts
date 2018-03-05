import { BodyResponseCallback } from 'google-auth-library/build/src/transporters';
import { GlobalOptions } from 'googleapis/build/src/lib/api';
import { AxiosRequestConfig } from 'axios';

export interface DriveRequest {}

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

export interface GenerateAuthUrlOpts {
   response_type?: string;
   client_id?: string;
   redirect_uri?: string;
   scope?: string[] | string;
}

/**
 * https://github.com/google/google-api-nodejs-client/blob/master/src/apis/drive/v3.ts
 * https://github.com/google/google-api-nodejs-client/blob/master/src/lib/api.ts
 */
export interface GoogleDrive {
   constructor(options?: GlobalOptions): GoogleDrive;

   files: {
      get(
         params: GetParams,
         options: AxiosRequestConfig | FileCallback,
         callback?: FileCallback
      ): void;

      list(
         params: ListParams,
         options: AxiosRequestConfig | FileCallback,
         callback?: FileCallback
      ): void;
   };
}

type FileCallback = BodyResponseCallback<any>;

export interface GetParams {
   fileId: string;
}

export interface ListParams {
   /**
    * Whether changes should include the file resource if the file is still
    * accessible by the user at the time of the request, even when a file was
    * removed from the list of changes and there will be no further change
    * entries for this file.
    */
   includeCorpusRemovals?: boolean;
   pageSize?: number;
   /**
    * Whether to restrict the results to changes inside the My Drive hierarchy.
    * This omits changes to files such as those in the Application Data folder
    * or shared files which have not been added to My Drive.
    */
   restrictToMyDrive?: boolean;
}
