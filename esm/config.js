import { Scope } from './types';
export const defaultConfig = {
    cacheSize: 10000,
    useCache: true,
    disableLogging: false,
    scope: [Scope.DriveReadOnly, Scope.DriveMetadataReadOnly]
};
