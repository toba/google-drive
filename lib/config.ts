import { AuthConfig } from '@toba/oauth';
import { Scope } from './types';

export interface GoogleConfig {
   /** Whether to cache file content in memory. */
   useCache: boolean;
   /** Cache size in bytes */
   cacheSize: number;
   scope?: Scope | Scope[];
   apiKey: string;
   folderID: string;
   auth: AuthConfig;
}

export const defaultConfig: Partial<GoogleConfig> = {
   cacheSize: 2048,
   useCache: true,
   scope: [Scope.DriveReadOnly, Scope.DriveMetadataReadOnly]
};
