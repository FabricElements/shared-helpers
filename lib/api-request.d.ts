import type { InterfaceAPIRequest } from './interfaces.js';
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
declare const _default: (options: InterfaceAPIRequest) => Promise<any>;
export default _default;
