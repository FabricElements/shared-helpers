/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import * as functions from 'firebase-functions';
import fetch from 'node-fetch';

/**
 * Call firebase project base API
 * @param {string} apiName
 * @param {string} path
 * @param {any} body
 */
export default async (apiName: string, path: string, body: any = {}) => {
  const config = functions.config();
  const apiBase = config[apiName];
  if (!(apiName || apiBase)) {
    throw new Error('Invalid api call');
  }
  const finalBody = JSON.stringify(body);
  const requestOptions: any = {
    method: 'POST',
    headers: {
      'authorization': `Bearer ${apiBase.token}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: finalBody, // request body. can be null, a string, a Buffer, a Blob, or a Node.js Readable stream
    redirect: 'error', // set to `manual` to extract redirect headers, `error` to reject redirect
    // The following properties are node-fetch extensions
    follow: 0, // maximum redirect count. 0 to not follow redirect
    timeout: 60000, // req/res timeout in ms, it resets on redirect. 0 to disable (OS limit applies).
    // Signal is recommended instead.
    size: 0, // maximum response body size in bytes. 0 to disable
    agent: null, // http(s).Agent instance, allows custom proxy, certificate, dns lookup etc.
  };
  const apiPath = `https://${apiBase.id}.firebaseapp.com/api/${path}`;
  try {
    const request = await fetch(apiPath, requestOptions);
    const bodyJson = await request.json();
    if (request.status !== 200) {
      if (request.status === 500) {
        throw new Error(`${apiName} isn't available`);
      }
      // @ts-ignore
      throw new Error(bodyJson.message || 'unknown error');
    }
    return bodyJson;
  } catch (error) {
    throw new Error(error.message);
  }
};
