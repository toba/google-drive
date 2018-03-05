// import google from './google';
// import factory from '../factory';

import { Client, ClientConfig } from './client';
//const authConfig = config.google.auth;

/**
 * http://code.google.com/apis/console/#project:1033232213688
 */
const config: ClientConfig = {
   apiKey: process.env['GOOGLE_KEY'] as string,
   projectID: '316480757902',
   analyticsID: '22180727', // shown as 'UA-22180727-1
   searchEngineID: process.env['GOOGLE_SEARCH_ID'] as string,
   blogID: '118459106898417641',
   drive: {
      apiKey: env('GOOGLE_DRIVE_KEY') as string,
      folderID: '0B0lgcM9JCuSbMWluNjE4LVJtZWM'
   },
   auth: {
      clientID: env('GOOGLE_CLIENT_ID') as string,
      secret: env('GOOGLE_SECRET') as string,
      callback: 'http://www.' + domain + '/auth/google',
      token: {
         type: null,
         access: process.env['GOOGLE_ACCESS_TOKEN'] as string,
         accessExpiration: null as Date,
         refresh: process.env['GOOGLE_REFRESH_TOKEN'] as string
      } as Token
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
