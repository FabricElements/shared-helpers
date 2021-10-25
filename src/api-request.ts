/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import fetch from "node-fetch";

/**
 * Call firebase project base API
 * @param options
 */
export default async (options: {
  body: any,
  method: "POST" | "GET",
  parameters: string,
  path: string,
  scheme: "Basic" | "Bearer" | "Digest" | "OAuth",
}) => {
  if (!options.path) {
    throw new Error("Invalid api call");
  }
  const finalBody = JSON.stringify(options.body);
  let requestOptions: any = {
    method: options.method,
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json"
    },
    body: finalBody,         // request body. can be null, a string, a Buffer, a Blob, or a Node.js Readable stream
    redirect: "error", // set to `manual` to extract redirect headers, `error` to reject redirect
    // The following properties are node-fetch extensions
    follow: 0,         // maximum redirect count. 0 to not follow redirect
    timeout: 60000, // req/res timeout in ms, it resets on redirect. 0 to disable (OS limit applies).
    // Signal is recommended instead.
    size: 0,            // maximum response body size in bytes. 0 to disable
    agent: null         // http(s).Agent instance, allows custom proxy, certificate, dns lookup etc.
  };
  if (options.scheme && options.parameters) {
    requestOptions.headers.Authorization = `${options.scheme} ${options.parameters}`;
  }
  try {
    const request = await fetch(options.path, requestOptions);
    const bodyJson = await request.json();
    if (request.status !== 200) {
      if (request.status === 500) {
        throw new Error(`${options.path} isn't available`);
      }
      // @ts-ignore
      throw new Error(bodyJson.message || "unknown error");
    }
    return bodyJson;
  } catch (error) {
    throw new Error(error.message);
  }
}
