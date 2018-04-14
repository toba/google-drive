import * as http from 'http';
import * as url from 'url';
import * as net from 'net';
import * as querystring from 'querystring';
import { OAuth2Client } from 'google-auth-library';
import { Scope, AccessType, AuthPrompt } from './types';
import { ChildProcess } from 'child_process';
/* tslint:disable-next-line:no-require-imports */
import opn = require('opn');

/**
 * Create temporary server to receive authorization callback.
 *
 * @see https://github.com/google/google-api-nodejs-client/blob/master/samples/sampleclient.js
 */
export const receive = (
   authClient: OAuth2Client,
   ...scope: Scope[]
): Promise<OAuth2Client> =>
   new Promise<OAuth2Client>((resolve, reject) => {
      const connections: Map<string, net.Socket> = new Map();
      const authUrl = authClient.generateAuthUrl({
         access_type: AccessType.Offline, // gets refresh token
         prompt: AuthPrompt.Consent,
         scope
      });

      http
         .createServer(
            async (req: http.IncomingMessage, res: http.ServerResponse) => {
               try {
                  if (req.url.indexOf('/oauth2callback') > -1) {
                     const qs: querystring.ParsedUrlQuery = querystring.parse(
                        url.parse(req.url).query
                     );
                     res.end(
                        'Authentication successful! Please return to the console.'
                     );
                     for (const c of connections.values()) {
                        c.destroy();
                     }
                     const { tokens } = await authClient.getToken(qs.code);
                     authClient.credentials = tokens;
                     resolve(authClient);
                  }
               } catch (e) {
                  reject(e);
               }
            }
         )
         .on('connection', conn => {
            const key = conn.remoteAddress + ':' + conn.remotePort;
            connections.set(key, conn);

            conn.on('close', () => {
               connections.delete(key);
            });
         })
         .listen(3000, () => {
            // open the browser to the authorize url to start the workflow
            opn(authUrl, { wait: false }).then((cp: ChildProcess) =>
               cp.unref()
            );
         });
   });
