import { BodyResponseCallback } from 'google-auth-library/build/src/transporters';
import {
   GlobalOptions,
   APIRequestMethodParams as RequestConfig
} from 'googleapis/build/src/lib/api';
import { AxiosResponse } from 'axios';
//import { HttpStatus } from '@toba/tools';
//import { OAuth2Client } from 'google-auth-library';
import { EventEmitter } from 'events';

//AxiosRequestConfig as RequestConfig
export { AxiosError as RequestError } from 'axios';

export {
   APIRequestMethodParams as RequestConfig
} from 'googleapis/build/src/lib/api';

export interface DriveRequest {}

export interface DriveFile {
   id: string;
   name: string;
   data: string;
}

export interface DriveResponse extends AxiosResponse<{ files: DriveFile[] }> {}

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

export enum SortBy {
   CreateTime = 'createdTime',
   Folder = 'folder',
   ModifiedByMeTime = 'modifiedByMeTime',
   ModifiedTime = 'modifiedTime',
   Name = 'name',
   NaturalName = 'name_natural',
   QuotaBytesUsed = 'quotaBytesUsed',
   Recency = 'recency',
   SharedWithMeTime = 'sharedWithMeTime',
   Starred = 'starred',
   ViewedByMeTime = 'viewedByMeTime'
}

export enum QuerySpace {
   Drive = 'drive',
   Photos = 'photos',
   AppDataFolder = 'appDataFolder'
}

/**
 * https://github.com/google/google-api-nodejs-client/blob/master/src/lib/api.ts
 */
export interface GoogleDrive {
   constructor(options?: GlobalOptions): GoogleDrive;

   /**
    * Interact with file objects.
    */
   files: {
      /**
       * https://github.com/google/google-api-nodejs-client/blob/master/src/apis/drive/v3.ts#L684
       */
      get(
         params: GetFileParams,
         config: RequestConfig | FileCallback,
         callback?: FileCallback
      ): EventEmitter;

      /**
       * https://github.com/google/google-api-nodejs-client/blob/master/src/apis/drive/v3.ts#L727
       */
      list(
         params: ListFilesParams,
         config: RequestConfig | FileCallback,
         callback?: FileCallback
      ): void;
   };
}

type FileCallback = BodyResponseCallback<any>;

export interface GetFileParams {
   fileId: string;
   /**
    * Whether the user is acknowledging the risk of downloading known malware or
    * other abusive files. This is only applicable when alt=media.
    */
   acknowledgeAbuse?: boolean;
   /**
    * Whether the requesting application supports Team Drives.
    */
   supportsTeamDrives?: boolean;
   alt?: string;
   timeout?: number;
}

export interface ListFilesParams {
   /**
    * A query for filtering the file results. See the "Search for Files" guide
    * for supported syntax.
    *
    * https://developers.google.com/drive/v3/web/search-parameters
    */
   q: string;

   /**
    * Comma-separated list of bodies of items (files/documents) to which the
    * query applies. Supported bodies are 'user', 'domain', 'teamDrive' and
    * 'allTeamDrives'. 'allTeamDrives' must be combined with 'user'; all other
    * values must be used in isolation. Prefer 'user' or 'teamDrive' to
    * 'allTeamDrives' for efficiency.
    */
   corpora?: string;

   /**
    * Whether Team Drive items should be included in results.
    */
   includeTeamDriveItems?: boolean;

   /**
    * A comma-separated list of sort keys. Valid keys are 'createdTime',
    * 'folder', 'modifiedByMeTime', 'modifiedTime', 'name', 'name_natural',
    * 'quotaBytesUsed', 'recency', 'sharedWithMeTime', 'starred', and
    * 'viewedByMeTime'. Each key sorts ascending by default, but may be reversed
    * with the 'desc' modifier. Example usage:
    *
    * ?orderBy=folder,modifiedTime desc,name
    *
    * Please note that there is a current limitation for users with
    * approximately one million files in which the requested sort order is
    * ignored.
    */
   orderBy?: string;

   /**
    * The maximum number of files to return per page. Partial or empty result
    * pages are possible even before the end of the files list has been reached.
    */
   pageSize?: number;

   /**
    * The token for continuing a previous list request on the next page. This
    * should be set to the value of 'nextPageToken' from the previous response.
    */
   pageToken?: string;

   /**
    * A comma-separated list of spaces to query within the corpus. Supported
    * values are 'drive', 'appDataFolder' and 'photos'.
    */
   spaces?: string;

   /**
    * Whether the requesting application supports Team Drives.
    */
   supportsTeamDrives?: boolean;

   /**
    * ID of Team Drive to search.
    */
   teamDriveId?: string;

   /**
    * Whether changes should include the file resource if the file is still
    * accessible by the user at the time of the request, even when a file was
    * removed from the list of changes and there will be no further change
    * entries for this file.
    */
   includeCorpusRemovals?: boolean;

   /**
    * Whether to restrict the results to changes inside the My Drive hierarchy.
    * This omits changes to files such as those in the Application Data folder
    * or shared files which have not been added to My Drive.
    */
   restrictToMyDrive?: boolean;
}
