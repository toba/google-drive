import { GoogleConfig } from './config';
import { AuthConfig } from '@toba/oauth';

/**
 * @see https://console.cloud.google.com/apis/credentials?project=trail-image-blog
 */
export const testConfig: GoogleConfig = {
   apiKey: process.env['GOOGLE_DRIVE_KEY'],
   folderID: '0B0lgcM9JCuSbMWluNjE4LVJtZWM',
   useCache: false,
   cacheSize: 0,
   auth: {
      apiKey: '',
      clientID: process.env['GOOGLE_CLIENT_ID'],
      secret: process.env['GOOGLE_SECRET'],
      callback: 'http://localhost/auth/google',
      token: {
         type: undefined,
         access: process.env['GOOGLE_ACCESS_TOKEN'],
         accessExpiration: undefined,
         refresh: process.env['GOOGLE_REFRESH_TOKEN']
      }
   } as AuthConfig
};

export const testFile = {
   name: 'With Nick and Kayla on Mores Mountain.gpx',
   id: null as string | null
};
