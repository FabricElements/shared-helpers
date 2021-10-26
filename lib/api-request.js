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
    let requestOptions = {
        method: options.method,
        headers: {
            "Accept": "application/json",
            "Content-Type": "application/json"
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
        const request = await (0, node_fetch_1.default)(options.path, requestOptions);
        const bodyJson = await request.json();
        if (request.status !== 200) {
            // if (request.status === 500) {
            //   throw new Error(`${options.path} isn't available`);
            // }
            // @ts-ignore
            throw new Error(bodyJson.message || "unknown error");
        }
        return bodyJson;
    }
    catch (error) {
        throw new Error(error.message);
    }
};
//# sourceMappingURL=api-request.js.map