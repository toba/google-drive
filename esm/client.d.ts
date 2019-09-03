/// <reference types="node" />
import { Writable } from 'stream';
import { EventEmitter } from '@toba/node-tools';
import { Token } from '@toba/oauth';
import { drive_v3 } from 'googleapis';
import { ListFilesParams } from './types';
import { GoogleConfig } from './config';
export declare const enum EventType {
    RefreshTokenError = 0,
    RefreshedAccessToken = 1,
    FoundFile = 2,
    FileNotFound = 3,
    CacheMiss = 4
}
/**
 * @see https://googleapis.dev/nodejs/googleapis/latest/drive/index.html
 * @see https://github.com/google/google-api-nodejs-client/blob/master/samples/sampleclient.js#L35
 */
export declare class GoogleDriveClient {
    private config;
    private cache;
    private api;
    private oauth;
    events: EventEmitter<EventType, any>;
    constructor(config: GoogleConfig);
    /**
     * Clear file cache.
     */
    clearCache(): void;
    /**
     * Log information if logging is enabled.
     */
    private logInfo;
    /**
     * Log error if logging is enabled.
     */
    private logError;
    /**
     * Log error if logging is enabled and pass same message to Promise reject
     * method.
     */
    private logAndReject;
    /**
     * Google's own drive client.
     */
    readonly drive: drive_v3.Drive;
    /**
     * Configured token object.
     */
    readonly token: Token | undefined;
    /**
     * Return URL that can be used to request an access token.
     *
     * @see http://google.github.io/google-api-nodejs-client/22.2.0/index.html#authorizing-and-authenticating
     * @see https://github.com/google/google-auth-library-nodejs#oauth2-client
     */
    readonly authorizationURL: string;
    /**
     * Ensure the Google API has been authenticated and authorized.
     *
     * @see https://developers.google.com/identity/protocols/OAuth2WebServer#refresh
     * @see https://github.com/google/google-auth-library-nodejs#manually-refreshing-access-token
     */
    private ensureAccess;
    /**
     * List of files matching query parameter.
     *
     * @see https://developers.google.com/drive/v3/web/search-parameters
     */
    getFileList(params: ListFilesParams): Promise<drive_v3.Schema$File[]>;
    /**
     * Get content of single file.
     *
     * @see https://developers.google.com/apis-explorer/?hl=en_US#p/drive/v3/drive.files.get
     */
    private getFileData;
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
    streamFile(fileId: string, fileName: string, stream: Writable): Promise<void>;
    /**
     * Retrieve text content of named file.
     */
    readFileWithName: (fileName: string) => Promise<string | null>;
    streamFileWithName(fileName: string, stream: Writable): Promise<void>;
    /**
     * Get ID of first file having given name.
     */
    private getFileIdForName;
    /**
     * Find file with name by creating query and retrieving with ID of first
     * matching item.
     */
    private getFileWithName;
    /**
     * Download file content.
     *
     * @see https://developers.google.com/drive/v3/web/manage-downloads
     */
    readFileWithID(fileId: string, fileName?: string | null): Promise<any>;
}
