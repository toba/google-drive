import { Config as AuthConfig } from '@toba/oauth';
import { Scope } from './types';

export interface BasicConfig {
   useCache: boolean;
   /** Cache size in bytes */
   cacheSize: number;
   scope?: Scope | Scope[];
}

export interface ClientConfig extends BasicConfig {
   apiKey: string;
   folderID: string;
   auth: AuthConfig;
}

export const defaultConfig: BasicConfig = {
   cacheSize: 2048,
   useCache: true,
   scope: [Scope.DriveReadOnly, Scope.DriveMetadataReadOnly]
};
