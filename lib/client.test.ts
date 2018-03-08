import { Config as AuthConfig } from '@toba/oauth';
import { GoogleDriveClient as Client, ClientConfig } from './client';

/**
 * http://code.google.com/apis/console/#project:1033232213688
 */
const config: ClientConfig = {
   apiKey: process.env['GOOGLE_DRIVE_KEY'],
   folderID: '0B0lgcM9JCuSbMWluNjE4LVJtZWM',
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

const client = new Client(config);

test('creates Google client', () => {
   expect(client).toBeDefined();
});

test('creates Drive client', () => {
   expect(client.drive).toBeDefined();
});

test('genenerates authorization URL', () => {
   const url = client.authorizationURL();
   expect(url).toBeDefined();
   expect(/google/.test(url)).toBe(true);

   //expect(url).toHaveProperty(authConfig.clientID);
   // expect(url).toHaveProperty(config.domain);
});

test('tests for expired access token', () => {
   expect(client.accessTokenExpired).toBe(true);
   //const now = new Date();
   //config.auth.token.accessExpiration = now.setDate(now.getDate() + 1);
   expect(client.accessTokenExpired).toBe(false);
});

// test('refreshes access token', () => {
//    authConfig.token.accessExpiration = null;
//    return google.auth.verify().then(() => {
//       expect(authConfig.token.accessExpiration).toBeDefined();
//       expect(authConfig.token.accessExpiration).toBeInstanceOf(Date);
//    });
// });

// test('retrieve GPX file content', () =>
//    factory
//       .buildLibrary()
//       .then(library => library.postWithKey('owyhee-snow-and-sand/lowlands'))
//       .then(post => google.drive.loadGPX(post))
//       .then(gpxText => {
//          expect(gpxText).toBeDefined();
//       }));
