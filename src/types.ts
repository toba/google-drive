import { drive_v3 } from 'googleapis';
import { GaxiosResponse, GaxiosError } from 'gaxios';

export type GetFileParams = drive_v3.Params$Resource$Files$Get;
export type ListFilesParams = drive_v3.Params$Resource$Files$List;
export type DriveFileList = drive_v3.Schema$FileList;
export type DriveFile = drive_v3.Schema$File;

export type GetFileResponse = GaxiosResponse<DriveFile>;
export type GetFileListResponse = GaxiosResponse<DriveFileList>;
export type RequestError = GaxiosError;

/**
 * Indicates whether your application can refresh access tokens when the user is
 * not present at the browser. Valid parameter values are `online`, which is the
 * default value, and 'offline'.
 */
export const enum AccessType {
   /**
    * Use if your application needs to refresh access tokens when the user is
    * not present at the browser. This value instructs the Google authorization
    * server to return a refresh token and an access token the first time that
    * your application exchanges an authorization code for tokens.
    */
   Offline = 'offline',
   Online = 'online'
}

export const enum ResponseType {
   /** Indicate response should be streamed. */
   Stream = 'stream',
   Code = 'CODE'
}

export const enum ResponseAlt {
   /**
    * Use when downloading files.
    * @see https://developers.google.com/drive/api/v3/manage-downloads#using_altmedia
    */
   Media = 'media'
}

/**
 * A space-delimited, case-sensitive list of prompts to present the user. If you
 * don't specify this parameter, the user will be prompted only the first time
 * your app requests access.
 *
 * @see https://github.com/google/oauth2client/issues/453
 */
export const enum AuthPrompt {
   /**
    * Do not display any authentication or consent screens. Must not be
    * specified with other values.
    */
   None = 'none',
   /** Prompt the user for consent. */
   Consent = 'consent',
   /** Prompt the user to select an account. */
   SelectAccount = 'select_account'
}

/**
 * Google access scopes. These values inform the consent screen that Google
 * displays to the user. Scopes enable your application to only request access
 * to the resources that it needs while also enabling users to control the
 * amount of access that they grant to your application. Thus, there is an
 * inverse relationship between the number of scopes requested and the
 * likelihood of obtaining user consent.
 *
 * @see https://developers.google.com/drive/web/scopes
 */
export enum Scope {
   DriveReadWrite = 'https://www.googleapis.com/auth/drive',
   DriveMetadata = 'https://www.googleapis.com/auth/drive.metadata',
   DriveReadOnly = 'https://www.googleapis.com/auth/drive.readonly',
   DriveMetadataReadOnly = 'https://www.googleapis.com/auth/drive.metadata.readonly',
   PhotoReadOnly = 'https://www.googleapis.com/auth/drive.photos.readonly',
   Calendar = 'https://www.googleapis.com/auth/calendar'
}

export const enum SortBy {
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

/**
 * Scope of file query in terms of item type.
 */
export const enum QuerySpace {
   Drive = 'drive',
   Photos = 'photos',
   AppDataFolder = 'appDataFolder'
}

/**
 * Scope of file query in terms of owner.
 */
export const enum Corpora {
   User = 'user',
   Domain = 'domain',
   TeamDrive = 'teamDrive',
   /**
    * Must be combined with `User`; all other values must be used in isolation.
    * Prefer `User` or `TeamDrive` to `AllTeamDrives` for efficiency.
    */
   AllTeamDrives = 'allTeamDrives,user'
}
