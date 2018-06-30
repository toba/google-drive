import '@toba/test';
import { MemoryStream } from '@toba/test';
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

test('relies on configured API key', () => {
   expect(testConfig.apiKey).toBeDefined();
});

test('returns current token', () => {
   if (!isConfigured) {
      return;
   }
   expect(client.token).toBe(testConfig.auth.token);
});

test('creates Google client', () => {
   if (!isConfigured) {
      return;
   }
   expect(client).toBeDefined();
});

test('creates Drive client', () => {
   if (!isConfigured) {
      return;
   }
   expect(client.drive).toBeDefined();
});

test('genenerates authorization URL', () => {
   if (!isConfigured) {
      return;
   }
   const url = client.authorizationURL;
   expect(url).toBeDefined();
   expect(/google/.test(url)).toBe(true);
});

test('retrieves file content', async () => {
   if (!isConfigured) {
      return;
   }
   const gpxText = await client.readFileWithName(testFile.name);
   expect(typeof gpxText).toBe(is.Type.String);
   expect(gpxText.indexOf('<?xml')).toBeGreaterThanOrEqual(0);
});

test('streams file content', async () => {
   if (!isConfigured) {
      return;
   }
   const stream = new MemoryStream();
   await client.readFileWithName(testFile.name, stream);
   expect(stream.receivedData).toBe(true);
   expect(stream.text.indexOf('<?xml')).toBeGreaterThanOrEqual(0);
});
