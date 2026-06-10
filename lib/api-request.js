/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import fetch from 'node-fetch';
/**
 * Executes an outbound HTTP request against an external or Firebase project API.
 *
 * Constructs a `node-fetch` request from the supplied options, attaches any
 * Authorization header when `scheme` and `credentials` are provided, and
 * deserialises the response body according to the `as` field.  When `as` is
 * omitted, the content-type of the response drives automatic deserialisation
 * (`application/json` → JSON, `text/*` → string, otherwise raw stream).
 *
 * @param {InterfaceAPIRequest} options - Configuration object describing the target
 *   endpoint, HTTP method, headers, body, authentication, and desired response format.
 * @returns {Promise<any>} A Promise that resolves to the deserialised response body.
 *   The concrete type depends on the `as` option: `object` for JSON,
 *   `string` for text, `ArrayBuffer`, `FormData`, `Blob`, or a Node.js
 *   `ReadableStream` for the remaining formats.
 * @throws {Error} If `options.path` is falsy, if the HTTP response is not
 *   `ok`, or if the server returns a JSON error body with a `message` field.
 */
export default async (options) => {
    if (!options.path) {
        throw new Error('Invalid api call');
    }
    const finalBody = JSON.stringify(options.body);
    const requestOptions = {
        method: options.method,
        // 'Content-Type': 'application/json',
        headers: options.headers ?? {},
        // can be null, a string, a Buffer, a Blob, or a Node.js Readable stream
        body: finalBody,
        // set to `manual` to extract redirect headers, `error` to reject redirect
        redirect: 'error',
        // The following properties are node-fetch extensions
        // maximum redirect count. 0 to not follow redirect
        follow: 2,
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
    const response = await fetch(options.path, requestOptions);
    if (!response.ok) {
        const BodyJsonError = await response.json();
        // noinspection ExceptionCaughtLocallyJS
        throw new Error(Object.prototype.hasOwnProperty.call(BodyJsonError, 'message') ? BodyJsonError['message'] : 'unknown error');
    }
    let responseData;
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
            responseData = response.body;
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
                    responseData = response.body;
            }
    }
    return responseData;
};
//# sourceMappingURL=api-request.js.map