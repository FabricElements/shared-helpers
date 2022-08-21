/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import fetch from 'node-fetch';
import type {InterfaceAPIRequest} from './interfaces.js';

/**
 * Call firebase project base API
 * @param {InterfaceAPIRequest} options
 */
export default async (options: InterfaceAPIRequest) => {
  if (!options.path) {
    throw new Error('Invalid api call');
  }
  const finalBody = JSON.stringify(options.body);
  const headers = options.headers ?? {};
  const requestOptions: any = {
    method: options.method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    // can be null, a string, a Buffer, a Blob, or a Node.js Readable stream
    body: finalBody,
    // set to `manual` to extract redirect headers, `error` to reject redirect
    redirect: 'error',
    // The following properties are node-fetch extensions
    // maximum redirect count. 0 to not follow redirect
    follow: 0,
    // req/res timeout in ms, it resets on redirect. 0 to disable.
    timeout: 60000,
    // Signal is recommended instead.
    size: 0, // maximum response body size in bytes. 0 to disable
    // http(s).Agent instance, allows custom proxy, certificate, dns lookup etc.
    agent: null,
    compress: true,
  };
  if (options.scheme && options.credentials) {
    requestOptions.headers.Authorization = `${options.scheme} ${options.credentials}`;
  }
  try {
    const response = await fetch(options.path, requestOptions);
    let responseData = null;
    if (!response.ok) {
      const BodyJsonError = await response.json();
      throw new Error(Object.prototype.hasOwnProperty.call(BodyJsonError, 'message') ? BodyJsonError['message'] : 'unknown error');
    }
    console.log('content-type', response.headers.get('content-type'));
    switch (options.as) {
      case 'arrayBuffer':
        responseData = await response.arrayBuffer();
        break;
      case 'formData':
        responseData = await response.formData();
        break;
      case 'blob':
        responseData = await response.blob();
        break;
      case 'json':
        responseData = await response.json();
        break;
      case 'text':
        responseData = await response.text();
        break;
      case 'raw':
        responseData = await response.body;
        break;
      default:
        // Return response depending on the content-type
        switch (response.headers.get('content-type')?.toString().toLowerCase()) {
          case 'text/plain':
          case 'text/html':
            responseData = await response.text();
            break;
          case 'application/json':
            responseData = await response.json();
            break;
          default:
            responseData = await response.body;
        }
    }
    return responseData;
  } catch (error) {
    // @ts-ignore
    throw new Error(error.message);
  }
};
