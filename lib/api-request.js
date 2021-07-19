/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import functions from "firebase-functions";
import fetch from "node-fetch";
/**
 * Call firebase project base API
 * @param apiName
 * @param path
 * @param body
 */
export default async (apiName, path, body = {}) => {
    const config = functions.config();
    const apiBase = config[apiName];
    if (!(apiName || apiBase)) {
        throw new Error("Invalid api call");
    }
    const finalBody = JSON.stringify(body);
    let requestOptions = {
        method: "POST",
        headers: {
            "authorization": `Bearer ${apiBase.token}`,
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
    const apiPath = `https://${apiBase.id}.firebaseapp.com/api/${path}`;
    try {
        const request = await fetch(apiPath, requestOptions);
        const bodyJson = await request.json();
        if (request.status !== 200) {
            if (request.status === 500) {
                throw new Error(`${apiName} isn't available`);
            }
            throw new Error(bodyJson.message || "unknown error");
        }
        return bodyJson;
    }
    catch (error) {
        throw new Error(error.message);
    }
};
//# sourceMappingURL=api-request.js.map