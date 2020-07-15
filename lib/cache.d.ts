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
    del: any;
    exists: any;
    get: any;
    hdel: any;
    hexists: any;
    hget: any;
    hgetall: any;
    hincrby: any;
    hset: any;
    prefix: string;
    set: any;
    constructor(firebaseConfig: Config, client: RedisClient);
}
