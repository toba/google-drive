import { AuthConfig } from '@toba/oauth';
import { Scope } from './types';
export interface GoogleConfig {
    /** Whether to cache file content in memory. */
    useCache: boolean;
    /** Cache size in bytes */
    cacheSize: number;
    /**
     * Whether to disable logging. Default is `false`. If disabled, emitted
     * events may be used instead to detect important state changes.
     */
    disableLogging?: boolean;
    scope?: Scope | Scope[];
    apiKey?: string;
    folderID: string;
    auth: AuthConfig;
}
export declare const defaultConfig: Partial<GoogleConfig>;
