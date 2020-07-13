/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import { config } from "firebase-functions";
import { RedisClient } from "redis";
import Config = config.Config;
/**
 * Cache
 */
export declare class Cache {
    client: RedisClient;
    config: Config;
    get: any;
    incr: any;
    prefix: string;
    set: any;
    constructor(firebaseConfig: Config, client: RedisClient);
}
