"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
const functions = require("firebase-functions");
const node_fetch_1 = require("node-fetch");
const config = functions.config();
exports.default = async (apiName, path, body = {}) => {
    const apiBase = config[apiName];
    if (!(apiName || apiBase)) {
        throw new Error("Invalid api call");
    }
    let requestOptions = {
        // These properties are part of the Fetch Standard
        method: "POST",
        headers: {
            authorization: `Bearer ${apiBase.token}`,
        },
        body,
        redirect: "follow",
        signal: null,
        // The following properties are node-fetch extensions
        follow: 0,
        timeout: 60000,
        compress: true,
        size: 0,
        agent: null // http(s).Agent instance, allows custom proxy, certificate, dns lookup etc.
    };
    const apiPath = `https://${apiBase.id}.firebaseapp.com/api/${path}`;
    const request = await node_fetch_1.default(apiPath, requestOptions);
    if (request.status !== 200) {
        if (request.status === 500) {
            throw new Error(`${apiName} isn't available`);
        }
        throw new Error(`${apiName} fetch error: ${request.message || "unknown error"}`);
    }
    return request;
};
//# sourceMappingURL=api-request.js.map