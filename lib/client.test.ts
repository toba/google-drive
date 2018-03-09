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

let client: Client;
let isConfigured = false;

beforeAll(() => {
   isConfigured = config.apiKey !== undefined;
   if (isConfigured) {
      client = new Client(config);
   }
}

test('relies on configured API key', () => {
   expect(config.apiKey).toBeDefined();
});

test('returns current token', ()=> {
   if (!isConfigured) { return; }
   expect(client.token).toBe(config.auth.token);
});

test('creates Google client', () => {
   if (!isConfigured) { return; }
   expect(client).toBeDefined();
});

test('creates Drive client', () => {
   if (!isConfigured) { return; }
   expect(client.drive).toBeDefined();
});

test('genenerates authorization URL', () => {
   if (!isConfigured) { return; }
   const url = client.authorizationURL;
   expect(url).toBeDefined();
   expect(/google/.test(url)).toBe(true);

   //expect(url).toHaveProperty(authConfig.clientID);
   // expect(url).toHaveProperty(config.domain);
});

test('tests for expired access token', () => {
   if (!isConfigured) { return; }
   expect(client.accessTokenExpired).toBe(true);
   const later = new Date();
   later.setDate(later.getDate() + 1);
   config.auth.token.accessExpiration = later;
   expect(client.accessTokenExpired).toBe(false);
});

test('refreshes access token', () => {
   if (!isConfigured) { return; }
   client.token.accessExpiration = null;
   return client.verifyToken().then(() => {
      expect(client.token.accessExpiration).toBeDefined();
      expect(client.token.accessExpiration).toBeInstanceOf(Date);
   });
});

test('retrieve `file content', () =>
   client.fileWithName('Boiling Over.gpx').then(gpxText => {
      expect(gpxText).toBeDefined();
   }));
