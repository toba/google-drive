import '@toba/test';
import { is } from '@toba/tools';
import { Config as AuthConfig } from '@toba/oauth';
import { GoogleDriveClient as Client } from './client';
import { ClientConfig } from './config';

/**
 * http://code.google.com/apis/console/#project:1033232213688
 */
const config: ClientConfig = {
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

const file = {
   name: 'With Nick and Kayla on Mores Mountain.gpx',
   id: null
};

let client: Client;
let isConfigured = false;

beforeAll(() => {
   isConfigured = config.apiKey !== undefined;
   if (isConfigured) {
      client = new Client(config);
   }
});

test('Relies on configured API key', () => {
   expect(config.apiKey).toBeDefined();
});

test('Returns current token', () => {
   if (!isConfigured) {
      return;
   }
   expect(client.token).toBe(config.auth.token);
});

test('Creates Google client', () => {
   if (!isConfigured) {
      return;
   }
   expect(client).toBeDefined();
});

test('Creates Drive client', () => {
   if (!isConfigured) {
      return;
   }
   expect(client.drive).toBeDefined();
});

test('Genenerates authorization URL', () => {
   if (!isConfigured) {
      return;
   }
   const url = client.authorizationURL;
   expect(url).toBeDefined();
   expect(/google/.test(url)).toBe(true);
});

test('Retrieves file content', () =>
   client.readFileWithName(file.name).then(gpxText => {
      expect(typeof gpxText).toBe(is.Type.String);
      expect(gpxText.indexOf('<?xml')).toBeGreaterThanOrEqual(0);
   }));
