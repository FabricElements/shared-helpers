/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import * as functions from "firebase-functions";
import fetch from "node-fetch";

const config = functions.config();

export default async (apiName: string, path: string, body: any = {}) => {
  const apiBase = config[apiName];
  if (!(apiName || apiBase)) {
    throw new Error("Invalid api call");
  }
  let requestOptions: any = {
    // These properties are part of the Fetch Standard
    method: "POST",
    headers: {     // request headers. format is the identical to that accepted by the Headers constructor (see below)
      authorization: `Bearer ${apiBase.token}`,
    },
    body,         // request body. can be null, a string, a Buffer, a Blob, or a Node.js Readable stream
    redirect: "follow", // set to `manual` to extract redirect headers, `error` to reject redirect
    signal: null,       // pass an instance of AbortSignal to optionally abort requests
    // The following properties are node-fetch extensions
    follow: 0,         // maximum redirect count. 0 to not follow redirect
    timeout: 60000,         // req/res timeout in ms, it resets on redirect. 0 to disable (OS limit applies). Signal is recommended instead.
    compress: true,     // support gzip/deflate content encoding. false to disable
    size: 0,            // maximum response body size in bytes. 0 to disable
    agent: null         // http(s).Agent instance, allows custom proxy, certificate, dns lookup etc.
  };
  const apiPath = `https://${apiBase.id}.firebaseapp.com/api/${path}`;
  const request = await fetch(apiPath, requestOptions);
  if (request.status !== 200) {
    if (request.status === 500) {
      throw new Error(`${apiName} isn't available`);
    }
    throw new Error(`${apiName} fetch error: ${request.message || "unknown error"}`);
  }
  return request;
};
