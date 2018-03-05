// import google from './google';
// import factory from '../factory';

import { GoogleDriveClient as Client, ClientConfig } from './client';
//const authConfig = config.google.auth;

/**
 * http://code.google.com/apis/console/#project:1033232213688
 */
const config: ClientConfig = {
   apiKey: 'GOOGLE_DRIVE_KEY',
   folderID: '0B0lgcM9JCuSbMWluNjE4LVJtZWM',
   auth: {
      clientID: 'GOOGLE_CLIENT_ID',
      secret: 'GOOGLE_SECRET',
      callback: 'http://localhost/auth/google',
      token: {
         type: null,
         access: 'GOOGLE_ACCESS_TOKEN',
         accessExpiration: null as Date,
         refresh: 'GOOGLE_REFRESH_TOKEN'
      }
   }
};

test('creates OAuth client', () => {
   expect(google.auth.client).toBeDefined();
});

test('genenerates authorization URL', () => {
   const url = google.auth.url();
   expect(url).toBeDefined();
   expect(url).to.include(authConfig.clientID);
   expect(url).to.include(config.domain);
});

test('tests for expired access token', () => {
   expect(google.auth.expired()).toBe(true);
   authConfig.token.accessExpiration = new Date() + 1;
   expect(google.auth.expired()).toBe(false);
});

test('refreshes access token', () => {
   authConfig.token.accessExpiration = null;
   return google.auth.verify().then(() => {
      expect(authConfig.token.accessExpiration).toBeDefined();
      expect(authConfig.token.accessExpiration).toBeInstanceOf(Date);
   });
});

test('retrieve GPX file content', () =>
   factory
      .buildLibrary()
      .then(library => library.postWithKey('owyhee-snow-and-sand/lowlands'))
      .then(post => google.drive.loadGPX(post))
      .then(gpxText => {
         expect(gpxText).toBeDefined();
      }));
