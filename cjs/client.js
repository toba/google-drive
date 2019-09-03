"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_tools_1 = require("@toba/node-tools");
const googleapis_1 = require("googleapis");
const config_1 = require("./config");
class GoogleDriveClient {
    constructor(config) {
        this.readFileWithName = (fileName) => this.config.useCache
            ? this.cache.getText(fileName)
            : this.getFileWithName(fileName);
        this.config = node_tools_1.merge(config, config_1.defaultConfig);
        this.oauth = new googleapis_1.google.auth.OAuth2(config.auth.clientID, config.auth.secret, config.auth.callback);
        this.api = null;
        this.events = new node_tools_1.EventEmitter();
        if (this.config.useCache) {
            this.cache = new node_tools_1.CompressCache(this.getFileWithName.bind(this), {
                maxBytes: this.config.cacheSize
            });
            this.cache.events.subscribe(node_tools_1.CacheEventType.KeyNotFound, (key) => {
                this.events.emit(4, key);
                this.logInfo(`File not found in cache`, { fileName: key });
            });
        }
        if (node_tools_1.is.value(config.auth.token)) {
            this.oauth.setCredentials({
                access_token: config.auth.token.access,
                refresh_token: config.auth.token.refresh
            });
        }
        googleapis_1.google.options({ auth: this.oauth });
        this.logInfo('Created Google Drive client manager');
    }
    clearCache() {
        if (this.config.useCache) {
            this.cache.clear();
        }
    }
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
    logError(msg, data) {
        if (!this.config.disableLogging) {
            console.error(msg, data);
        }
    }
    logAndReject(reject, msg, data) {
        this.logError(msg, data);
        reject(msg);
    }
    get drive() {
        if (this.api === null) {
            this.api = googleapis_1.google.drive('v3');
            this.logInfo('Created Google Drive client');
        }
        return this.api;
    }
    get token() {
        return this.config.auth.token;
    }
    get authorizationURL() {
        return this.oauth.generateAuthUrl({
            access_type: "offline",
            prompt: "consent",
            scope: this.config.scope
        });
    }
    async getAccessToken(code) {
        const res = await this.oauth.getToken(code);
        return {
            access: res.tokens.access_token,
            accessExpiration: node_tools_1.is.number(res.tokens.expiry_date)
                ? new Date(res.tokens.expiry_date)
                : undefined,
            refresh: res.tokens.refresh_token
        };
    }
    async ensureAccess() {
        return;
    }
    async getFileList(params) {
        await this.ensureAccess();
        return new Promise((resolve, reject) => {
            this.drive.files.list(params, (err, res) => {
                if (node_tools_1.is.value(err)) {
                    this.logAndReject(reject, err);
                }
                else if (res.status != node_tools_1.HttpStatus.OK) {
                    this.logAndReject(reject, `Server returned HTTP status ${res.status} for [${params.q}]`, { query: params.q });
                }
                else if (node_tools_1.is.defined(res, 'data') &&
                    node_tools_1.is.defined(res.data, 'files')) {
                    resolve(res.data.files);
                }
                else {
                    this.logAndReject(reject, `No data returned for [${params.q}]`, { query: params.q });
                }
            });
        });
    }
    async getFileData(params, fileName = null) {
        await this.ensureAccess();
        return new Promise((resolve, reject) => {
            this.drive.files.get(params, (err, res) => {
                if (node_tools_1.is.value(err)) {
                    this.logAndReject(reject, err, { fileName });
                }
                else if (res.status != node_tools_1.HttpStatus.OK) {
                    this.logAndReject(reject, `Server returned HTTP status ${res.status}`, { fileName });
                }
                else if (node_tools_1.is.defined(res, 'data')) {
                    this.events.emit(2, fileName);
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
    async streamFile(fileId, fileName, stream) {
        return new Promise(async (resolve, reject) => {
            stream.on('finish', resolve);
            const params = {
                fileId,
                alt: "media"
            };
            const res = await this.drive.files.get(params, {
                responseType: "stream"
            });
            res.data
                .on('error', (err) => {
                this.logAndReject(reject, err, { fileName });
            })
                .on('end', () => {
                this.events.emit(2, fileName);
            })
                .pipe(stream);
        });
    }
    async streamFileWithName(fileName, stream) {
        if (this.config.useCache) {
            const bytes = await this.cache.getZip(fileName);
            if (node_tools_1.is.value(bytes)) {
                stream.write(bytes, "buffer");
                return;
            }
        }
        const fileID = await this.getFileIdForName(fileName);
        return fileID === null
            ? Promise.resolve()
            : this.streamFile(fileID, fileName, stream);
    }
    async getFileIdForName(fileName) {
        await this.ensureAccess();
        const params = {
            q: `name = '${fileName}' and '${this.config.folderID}' in parents`,
            spaces: "drive"
        };
        const files = await this.getFileList(params);
        return files.length == 0 ? null : files[0].id;
    }
    async getFileWithName(fileName) {
        const fileID = await this.getFileIdForName(fileName);
        if (fileID === null) {
            return Promise.reject(`File not found: “${fileName}”`);
        }
        else {
            return this.readFileWithID(fileID, fileName);
        }
    }
    async readFileWithID(fileId, fileName = null) {
        await this.ensureAccess();
        const params = {
            fileId,
            alt: "media"
        };
        const text = await this.getFileData(params, fileName);
        if (this.config.useCache && fileName !== null) {
            this.cache.addText(fileName, text);
        }
        return text;
    }
}
exports.GoogleDriveClient = GoogleDriveClient;
