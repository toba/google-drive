[![npm package](https://img.shields.io/npm/v/@toba/google-drive.svg)](https://www.npmjs.org/package/@toba/google-drive)
[![Build Status](https://travis-ci.org/toba/google-drive.svg?branch=master)](https://travis-ci.org/toba/google-drive)
![Code style](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)
[![Dependencies](https://img.shields.io/david/toba/google-drive.svg)](https://david-dm.org/toba/google-drive)
[![DevDependencies](https://img.shields.io/david/dev/toba/google-drive.svg)](https://david-dm.org/toba/google-drive#info=devDependencies&view=list)
[![codecov](https://codecov.io/gh/toba/google-drive/branch/master/graph/badge.svg)](https://codecov.io/gh/toba/google-drive)

# Usage

```
yarn add @toba/google-drive
```

```ts
const config: ClientConfig = {
   apiKey: process.env['GOOGLE_DRIVE_KEY'],
   folderID: 'some folder ID',
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
const client = new Client(config);
const text = await client.readFileWithName('myfile.txt');
```
