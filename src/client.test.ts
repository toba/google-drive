import { MemoryStream, sleep } from '@toba/test'
import { clone, ValueType } from '@toba/node-tools'
import { GoogleDriveClient as Client, EventType } from './client'
import { testConfig, testFile, authCode } from './.test-data'

let client: Client
const isConfigured = testConfig.apiKey !== undefined

beforeAll(() => {
   if (isConfigured) client = new Client(testConfig)
})

test('relies on configured API key', () => {
   expect(testConfig.apiKey).toBeDefined()
})

if (isConfigured) {
   if (authCode !== undefined && authCode.length > 10) {
      test('exchanges OAuth code for access token', async () => {
         const res = await client.getAccessToken(authCode!)
         expect(res).toBeDefined()
         console.log(res)
      })
   }

   test('returns current token', () => {
      expect(client.token).toEqual(testConfig.auth.token)
   })

   test('defines method to retrieve access token', () => {
      expect(client.getAccessToken).toBeDefined()
   })

   test('creates Google client', () => {
      expect(client).toBeDefined()
   })

   test('creates Drive client', () => {
      expect(client.drive).toBeDefined()
   })

   test('genenerates authorization URL', () => {
      const url = client.authorizationURL
      expect(url).toBeDefined()
      expect(/google/.test(url)).toBe(true)
      //console.log(url)
   })

   test('retrieves file content', async () => {
      const gpxText = await client.readFileWithName(testFile.name)
      expect(typeof gpxText).toBe(ValueType.String)
      expect(gpxText!.indexOf('<?xml')).toBeGreaterThanOrEqual(0)
   })

   test('caches file contents', async () => {
      const config = clone(testConfig)
      const miss = jest.fn()

      if (config === null || config === undefined) return

      config.useCache = true
      config.cacheSize = 10000

      const cacheClient = new Client(config)

      cacheClient.events.subscribe(EventType.CacheMiss, miss)

      let gpxText = await cacheClient.readFileWithName(testFile.name)
      expect(gpxText!.indexOf('<?xml')).toBeGreaterThanOrEqual(0)
      expect(miss).toHaveBeenCalledTimes(1)

      // should read from cache second time
      gpxText = await cacheClient.readFileWithName(testFile.name)
      expect(miss).toHaveBeenCalledTimes(1)
   })

   test('streams files', async () => {
      const stream = new MemoryStream()
      const config = clone(testConfig)
      const miss = jest.fn()

      if (config === null || config === undefined) return

      config.useCache = true
      config.cacheSize = 10000

      const cacheClient = new Client(config)

      cacheClient.events.subscribe(EventType.CacheMiss, miss)

      await cacheClient.streamFileWithName(testFile.name, stream)
      expect(stream.receivedData).toBe(true)
      expect(miss).toHaveBeenCalledTimes(1)

      // stream from cache
      await sleep(2000)
      const stream2 = new MemoryStream()
      await cacheClient.streamFileWithName(testFile.name, stream2)

      expect(stream2.receivedData).toBe(true)
      // shouldn't miss the second time
      expect(miss).toHaveBeenCalledTimes(1)
   })
}
