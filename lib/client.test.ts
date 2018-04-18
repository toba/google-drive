import '@toba/test';
import { is } from '@toba/tools';
import { GoogleDriveClient as Client } from './client';
import { testConfig, testFile } from './.test-data';

let client: Client;
let isConfigured = false;

beforeAll(() => {
   isConfigured = testConfig.apiKey !== undefined;
   if (isConfigured) {
      client = new Client(testConfig);
   }
});

test('Relies on configured API key', () => {
   expect(testConfig.apiKey).toBeDefined();
});

test('Returns current token', () => {
   if (!isConfigured) {
      return;
   }
   expect(client.token).toBe(testConfig.auth.token);
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

test('Retrieves file content', async () => {
   const gpxText = await client.readFileWithName(testFile.name);
   expect(typeof gpxText).toBe(is.Type.String);
   expect(gpxText.indexOf('<?xml')).toBeGreaterThanOrEqual(0);
});
