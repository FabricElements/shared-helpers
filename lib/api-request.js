"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
const inclusion_1 = tslib_1.__importDefault(require("inclusion"));
/**
 * Call firebase project base API
 * @param {InterfaceAPIRequest} options
 */
exports.default = async (options) => {
    if (!options.path) {
        throw new Error('Invalid api call');
    }
    const finalBody = JSON.stringify(options.body);
    const headers = options.headers ?? {};
    const requestOptions = {
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
        size: 0,
        // http(s).Agent instance, allows custom proxy, certificate, dns lookup etc.
        agent: null,
    };
    if (options.scheme && options.credentials) {
        requestOptions.headers.Authorization = `${options.scheme} ${options.credentials}`;
    }
    try {
        const { default: fetch } = await (0, inclusion_1.default)('node-fetch');
        const response = await fetch(options.path, requestOptions);
        let responseData = null;
        if (!response.ok) {
            const BodyJsonError = await response.json();
            throw new Error(Object.prototype.hasOwnProperty.call(BodyJsonError, 'message') ? BodyJsonError['message'] : 'unknown error');
        }
        console.log(response.headers.get('content-type'));
        if (options.raw) {
            // Return raw body response
            responseData = await response.body;
        }
        else {
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
    }
    catch (error) {
        // @ts-ignore
        throw new Error(error.message);
    }
};
//# sourceMappingURL=api-request.js.map