import { is, merge, HttpStatus, EventEmitter, CompressCache, CacheEventType } from '@toba/node-tools';
import { google } from 'googleapis';
import { defaultConfig } from './config';
/**
 * @see https://googleapis.dev/nodejs/googleapis/latest/drive/index.html
 * @see https://github.com/google/google-api-nodejs-client/blob/master/samples/sampleclient.js#L35
 */
export class GoogleDriveClient {
    constructor(config) {
        /**
         * Retrieve text content of named file.
         */
        this.readFileWithName = (fileName) => this.config.useCache
            ? this.cache.getText(fileName)
            : this.getFileWithName(fileName);
        this.config = merge(config, defaultConfig);
        this.oauth = new google.auth.OAuth2(config.auth.clientID, config.auth.secret, config.auth.callback);
        this.api = null;
        this.events = new EventEmitter();
        if (this.config.useCache) {
            this.cache = new CompressCache(this.getFileWithName.bind(this), {
                maxBytes: this.config.cacheSize
            });
            // emit key not found as cache miss event
            this.cache.events.subscribe(CacheEventType.KeyNotFound, (key) => {
                this.events.emit(4 /* CacheMiss */, key);
                this.logInfo(`File not found in cache`, { fileName: key });
            });
        }
        if (is.value(config.auth.token)) {
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
    clearCache() {
        if (this.config.useCache) {
            this.cache.clear();
        }
    }
    /**
     * Log information if logging is enabled.
     */
    logInfo(msg, data) {
        if (!this.config.disableLogging) {
            if (data !== undefined) {
                console.info(msg, data);
            }
            else {
                console.info(msg);
            }
        }
    }
    /**
     * Log error if logging is enabled.
     */
    logError(msg, data) {
        if (!this.config.disableLogging) {
            console.error(msg, data);
        }
    }
    /**
     * Log error if logging is enabled and pass same message to Promise reject
     * method.
     */
    logAndReject(reject, msg, data) {
        this.logError(msg, data);
        reject(msg);
    }
    /**
     * Google's own drive client.
     */
    get drive() {
        if (this.api === null) {
            this.api = google.drive('v3');
            this.logInfo('Created Google Drive client');
        }
        return this.api;
    }
    /**
     * Configured token object.
     */
    get token() {
        return this.config.auth.token;
    }
    /**
     * Return URL that can be used to request an access token.
     *
     * @see http://google.github.io/google-api-nodejs-client/22.2.0/index.html#authorizing-and-authenticating
     * @see https://github.com/google/google-auth-library-nodejs#oauth2-client
     */
    get authorizationURL() {
        return this.oauth.generateAuthUrl({
            access_type: "offline" /* Offline */,
            prompt: "consent" /* Consent */,
            scope: this.config.scope
        });
    }
    /**
     * @param code Authorization code returned by initial authorization URL
     */
    async getAccessToken(code) {
        const res = await this.oauth.getToken(code);
        return {
            access: res.tokens.access_token,
            accessExpiration: is.number(res.tokens.expiry_date)
                ? new Date(res.tokens.expiry_date)
                : undefined,
            refresh: res.tokens.refresh_token
        };
    }
    /**
     * Ensure the Google API has been authenticated and authorized.
     *
     * @see https://developers.google.com/identity/protocols/OAuth2WebServer#refresh
     * @see https://github.com/google/google-auth-library-nodejs#manually-refreshing-access-token
     */
    async ensureAccess() {
        //await this.oauth.getRequestMetadata();
        return;
    }
    /**
     * List of files matching query parameter.
     *
     * @see https://developers.google.com/drive/v3/web/search-parameters
     */
    async getFileList(params) {
        await this.ensureAccess();
        return new Promise((resolve, reject) => {
            this.drive.files.list(params, (err, res) => {
                if (is.value(err)) {
                    this.logAndReject(reject, err);
                }
                else if (res.status != HttpStatus.OK) {
                    this.logAndReject(reject, `Server returned HTTP status ${res.status} for [${params.q}]`, { query: params.q });
                }
                else if (is.defined(res, 'data') &&
                    is.defined(res.data, 'files')) {
                    resolve(res.data.files);
                }
                else {
                    this.logAndReject(reject, `No data returned for [${params.q}]`, { query: params.q });
                }
            });
        });
    }
    /**
     * Get content of single file.
     *
     * @see https://developers.google.com/apis-explorer/?hl=en_US#p/drive/v3/drive.files.get
     */
    async getFileData(params, fileName = null) {
        await this.ensureAccess();
        return new Promise((resolve, reject) => {
            this.drive.files.get(params, (err, res) => {
                if (is.value(err)) {
                    this.logAndReject(reject, err, { fileName });
                }
                else if (res.status != HttpStatus.OK) {
                    this.logAndReject(reject, `Server returned HTTP status ${res.status}`, { fileName });
                }
                else if (is.defined(res, 'data')) {
                    this.events.emit(2 /* FoundFile */, fileName);
                    resolve(res.data);
                }
                else {
                    let msg = 'No data returned for file';
                    if (fileName != null) {
                        msg += ' ' + fileName;
                    }
                    this.logAndReject(reject, msg, { fileName });
                }
            });
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
    async streamFile(fileId, fileName, stream) {
        return new Promise(async (resolve, reject) => {
            stream.on('finish', resolve);
            const params = {
                fileId,
                alt: "media" /* Media */
            };
            const res = await this.drive.files.get(params, {
                responseType: "stream" /* Stream */
            });
            res.data
                .on('error', (err) => {
                this.logAndReject(reject, err, { fileName });
            })
                .on('end', () => {
                this.events.emit(2 /* FoundFile */, fileName);
            })
                .pipe(stream);
        });
    }
    async streamFileWithName(fileName, stream) {
        if (this.config.useCache) {
            const bytes = await this.cache.getZip(fileName);
            if (is.value(bytes)) {
                stream.write(bytes, "buffer" /* Buffer */);
                return;
            }
        }
        const fileID = await this.getFileIdForName(fileName);
        return fileID === null
            ? Promise.resolve()
            : this.streamFile(fileID, fileName, stream);
    }
    /**
     * Get ID of first file having given name.
     */
    async getFileIdForName(fileName) {
        await this.ensureAccess();
        const params = {
            q: `name = '${fileName}' and '${this.config.folderID}' in parents`,
            spaces: "drive" /* Drive */
        };
        const files = await this.getFileList(params);
        return files.length == 0 ? null : files[0].id;
    }
    /**
     * Find file with name by creating query and retrieving with ID of first
     * matching item.
     */
    async getFileWithName(fileName) {
        const fileID = await this.getFileIdForName(fileName);
        if (fileID === null) {
            return Promise.reject(`File not found: “${fileName}”`);
        }
        else {
            return this.readFileWithID(fileID, fileName);
        }
    }
    /**
     * Download file content.
     *
     * @see https://developers.google.com/drive/v3/web/manage-downloads
     */
    async readFileWithID(fileId, fileName = null) {
        await this.ensureAccess();
        const params = {
            fileId,
            alt: "media" /* Media */
            //timeout: 10000
        };
        const text = await this.getFileData(params, fileName);
        if (this.config.useCache && fileName !== null) {
            this.cache.addText(fileName, text);
        }
        return text;
    }
}
