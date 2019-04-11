"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
const functions = require("firebase-functions");
const request = require("request-promise-native");
const config = functions.config();
exports.default = async (apiName, path, body = {}) => {
    const apiBase = config[apiName];
    if (!(apiName || apiBase)) {
        throw new Error("Invalid api call");
    }
    const apiPath = `https://${apiBase.id}.firebaseapp.com/api/${path}`;
    return request({
        followAllRedirects: false,
        method: "POST",
        simple: true,
        uri: apiPath,
        body,
        json: true,
        headers: {
            authorization: `Bearer ${apiBase.token}`,
        },
    });
};
//# sourceMappingURL=api-request.js.map