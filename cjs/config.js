"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = require("./types");
exports.defaultConfig = {
    cacheSize: 10000,
    useCache: true,
    disableLogging: false,
    scope: [types_1.Scope.DriveReadOnly, types_1.Scope.DriveMetadataReadOnly]
};
