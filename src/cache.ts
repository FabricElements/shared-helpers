/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import * as functions from "firebase-functions";
import * as redis from "redis";
import {promisify} from "util";

const config = functions.config();
export const host = config.redis.host;
export const port = Number(config.redis.port);
export const client = redis.createClient(port, host);

export const rincr = promisify(client.incr).bind(client);
export const rget = promisify(client.get).bind(client);
export const rset = promisify(client.set).bind(client);
