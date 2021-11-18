"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
const node_fetch_1 = (0, tslib_1.__importDefault)(require("node-fetch"));
/**
 * Call firebase project base API
 * @param options
 */
exports.default = async (options) => {
    if (!options.path) {
        throw new Error("Invalid api call");
    }
    const finalBody = JSON.stringify(options.body);
    const headers = options.headers ?? {};
    let requestOptions = {
        method: options.method,
        headers: {
            // "Accept": "application/json",
            // "Content-Type": "application/json",
            ...headers,
        },
        body: finalBody,
        redirect: "error",
        // The following properties are node-fetch extensions
        follow: 0,
        timeout: 60000,
        // Signal is recommended instead.
        size: 0,
        agent: null // http(s).Agent instance, allows custom proxy, certificate, dns lookup etc.
    };
    if (options.scheme && options.credentials) {
        requestOptions.headers.Authorization = `${options.scheme} ${options.credentials}`;
    }
    try {
        const response = await (0, node_fetch_1.default)(options.path, requestOptions);
        let responseData = null;
        if (!response.ok) {
            const bodyJsonError = await response.json();
            // @ts-ignore
            throw new Error(bodyJsonError.message || "unknown error");
        }
        console.log(response.headers.get("content-type"));
        if (options.raw) {
            // Return raw body response
            responseData = await response.body;
        }
        else {
            // Return response depending on the content-type
            switch (response.headers.get("content-type")?.toString().toLowerCase()) {
                case "text/plain":
                case "text/html":
                    responseData = await response.text();
                    break;
                case "application/json":
                    responseData = await response.json();
                    break;
                default:
                    responseData = await response.body;
            }
        }
        return responseData;
    }
    catch (error) {
        throw new Error(error.message);
    }
};
//# sourceMappingURL=api-request.js.map