import { AxiosResponse } from 'axios';
import { MimeType } from '@toba/tools';
export { AxiosError as RequestError } from 'axios';

export enum AccessType {
   Offline = 'offline',
   /** Gets refresh token */
   Online = 'online'
}

export enum CodeChallengeMethod {
   Plain = 'plain',
   S256 = 'S256'
}

export interface DriveRequest {}

export interface DriveItem {
   kind: string;
}

export interface DriveFile extends DriveItem {
   id: string;
   name: string;
   mimeType: MimeType;
}

/**
 * @see https://developers.google.com/apis-explorer/?hl=en_US#p/drive/v3/drive.files.list
 */
export interface DriveFileList extends DriveItem {
   imcompleteSearch: boolean;
   files: DriveFile[];
}

export interface GetFileListResponse extends AxiosResponse<DriveFileList> {}
export interface GetFileResponse<T> extends AxiosResponse<T> {}

/**
 * Google access scopes.
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

/**
 * @see https://github.com/google/oauth2client/issues/453
 */
export enum AuthPrompt {
   None = 'none',
   Consent = 'consent',
   SelectAccount = 'select_account'
}

/**
 * Copied from source because it isn't exported in npm package.
 *
 * @see https://github.com/google/google-auth-library-nodejs/blob/master/src/auth/oauth2client.ts#L39
 */
export interface GenerateAuthUrlOpts {
   /**
    * Recommended. Indicates whether your application can refresh access tokens
    * when the user is not present at the browser. Valid parameter values are
    * 'online', which is the default value, and 'offline'. Set the value to
    * 'offline' if your application needs to refresh access tokens when the user
    * is not present at the browser. This value instructs the Google
    * authorization server to return a refresh token and an access token the
    * first time that your application exchanges an authorization code for
    * tokens.
    */
   access_type?: AccessType;
   /**
    * The 'response_type' will always be set to 'CODE'.
    */
   response_type?: string;
   /**
    * The client ID for your application. The value passed into the constructor
    * will be used if not provided. You can find this value in the API Console.
    */
   client_id?: string;
   /**
    * Determines where the API server redirects the user after the user
    * completes the authorization flow. The value must exactly match one of the
    * 'redirect_uri' values listed for your project in the API Console. Note that
    * the http or https scheme, case, and trailing slash ('/') must all match.
    * The value passed into the constructor will be used if not provided.
    */
   redirect_uri?: string;
   /**
    * Required. A space-delimited list of scopes that identify the resources that
    * your application could access on the user's behalf. These values inform the
    * consent screen that Google displays to the user. Scopes enable your
    * application to only request access to the resources that it needs while
    * also enabling users to control the amount of access that they grant to your
    * application. Thus, there is an inverse relationship between the number of
    * scopes requested and the likelihood of obtaining user consent. The
    * OAuth 2.0 API Scopes document provides a full list of scopes that you might
    * use to access Google APIs. We recommend that your application request
    * access to authorization scopes in context whenever possible. By requesting
    * access to user data in context, via incremental authorization, you help
    * users to more easily understand why your application needs the access it is
    * requesting.
    */
   scope?: Scope[] | Scope;
   /**
    * Recommended. Specifies any string value that your application uses to
    * maintain state between your authorization request and the authorization
    * server's response. The server returns the exact value that you send as a
    * name=value pair in the hash (#) fragment of the 'redirect_uri' after the
    * user consents to or denies your application's access request. You can use
    * this parameter for several purposes, such as directing the user to the
    * correct resource in your application, sending nonces, and mitigating
    * cross-site request forgery. Since your redirect_uri can be guessed, using a
    * state value can increase your assurance that an incoming connection is the
    * result of an authentication request. If you generate a random string or
    * encode the hash of a cookie or another value that captures the client's
    * state, you can validate the response to additionally ensure that the
    * request and response originated in the same browser, providing protection
    * against attacks such as cross-site request forgery. See the OpenID Connect
    * documentation for an example of how to create and confirm a state token.
    */
   state?: string;
   /**
    * Optional. Enables applications to use incremental authorization to request
    * access to additional scopes in context. If you set this parameter's value
    * to true and the authorization request is granted, then the new access token
    * will also cover any scopes to which the user previously granted the
    * application access. See the incremental authorization section for examples.
    */
   include_granted_scopes?: boolean;
   /**
    * Optional. If your application knows which user is trying to authenticate,
    * it can use this parameter to provide a hint to the Google Authentication
    * Server. The server uses the hint to simplify the login flow either by
    * prefilling the email field in the sign-in form or by selecting the
    * appropriate multi-login session. Set the parameter value to an email
    * address or sub identifier, which is equivalent to the user's Google ID.
    */
   login_hint?: string;
   /**
    * Optional. A space-delimited, case-sensitive list of prompts to present the
    * user. If you don't specify this parameter, the user will be prompted only
    * the first time your app requests access.  Possible values are:
    *
    * 'none' - Do not display any authentication or consent screens. Must not be
    *          specified with other values.
    * 'consent' - rompt the user for consent.
    * 'select_account' - Prompt the user to select an account.
    */
   prompt?: string;
   /**
    * Recommended. Specifies what method was used to encode a 'code_verifier'
    * that will be used during authorization code exchange. This parameter must
    * be used with the 'code_challenge' parameter. The value of the
    * 'code_challenge_method' defaults to "plain" if not present in the request
    * that includes a 'code_challenge'. The only supported values for this
    * parameter are "S256" or "plain".
    */
   code_challenge_method?: CodeChallengeMethod;
   /**
    * Recommended. Specifies an encoded 'code_verifier' that will be used as a
    * server-side challenge during authorization code exchange. This parameter
    * must be used with the 'code_challenge' parameter described above.
    */
   code_challenge?: string;
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
    * @see https://developers.google.com/drive/v3/web/search-parameters
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
