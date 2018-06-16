import { GoogleConfig } from './config';
import { AuthConfig } from '@toba/oauth';

/**
 * @see http://code.google.com/apis/console/#project:1033232213688
 */
export const testConfig: GoogleConfig = {
   apiKey: process.env['GOOGLE_DRIVE_KEY'],
   folderID: '0B0lgcM9JCuSbMWluNjE4LVJtZWM',
   useCache: false,
   cacheSize: 0,
   auth: {
      clientID: process.env['GOOGLE_CLIENT_ID'],
      secret: process.env['GOOGLE_SECRET'],
      callback: 'http://localhost/auth/google',
      token: {
         type: null,
         access: process.env['GOOGLE_ACCESS_TOKEN'],
         accessExpiration: null as Date,
         refresh: process.env['GOOGLE_REFRESH_TOKEN']
      }
   } as AuthConfig
};

export const testFile = {
   name: 'With Nick and Kayla on Mores Mountain.gpx',
   id: null
};
