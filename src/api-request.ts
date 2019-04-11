/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import * as functions from "firebase-functions";
import * as request from "request-promise-native";

const config = functions.config();

export default async (apiName: string, path: string, body: any = {}) => {
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
