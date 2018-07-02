import '@toba/test';
import { MemoryStream } from '@toba/test';
import { is } from '@toba/tools';
import { GoogleDriveClient as Client } from './client';
import { testConfig, testFile } from './.test-data';

let client: Client;
const isConfigured = testConfig.apiKey !== undefined;

beforeAll(() => {
   if (isConfigured) {
      client = new Client(testConfig);
   }
});

test('relies on configured API key', () => {
   expect(testConfig.apiKey).toBeDefined();
});

if (isConfigured) {
   test('returns current token', () => {
      expect(client.token).toBe(testConfig.auth.token);
   });

   test('creates Google client', () => {
      expect(client).toBeDefined();
   });

   test('creates Drive client', () => {
      expect(client.drive).toBeDefined();
   });

   test('genenerates authorization URL', () => {
      const url = client.authorizationURL;
      expect(url).toBeDefined();
      expect(/google/.test(url)).toBe(true);
   });

   test('retrieves file content', async () => {
      const gpxText = await client.readFileWithName(testFile.name);
      expect(typeof gpxText).toBe(is.Type.String);
      expect(gpxText.indexOf('<?xml')).toBeGreaterThanOrEqual(0);
   });

   test('streams file content', async () => {
      const stream = new MemoryStream();
      await client.readFileWithName(testFile.name, stream);
      expect(stream.receivedData).toBe(true);
      expect(stream.text.indexOf('<?xml')).toBeGreaterThanOrEqual(0);
   });
}
