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
    hexists: any;
    hget: any;
    hGetAllCache: any;
    hincrby: any;
    hSetCache: any;
    prefix: string;
    constructor(firebaseConfig: Config, client: RedisClient);
}
