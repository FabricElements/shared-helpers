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
    del: (op1?: any, op2?: any, op3?: any) => Promise<any>;
    exists: (op1?: any, op2?: any, op3?: any) => Promise<any>;
    flushall: (op1?: any, op2?: any, op3?: any) => Promise<any>;
    flushdb: (op1?: any, op2?: any, op3?: any) => Promise<any>;
    get: (op1?: any, op2?: any, op3?: any) => Promise<string>;
    hdel: (op1?: any, op2?: any, op3?: any) => Promise<any>;
    hexists: (op1?: any, op2?: any, op3?: any) => Promise<any>;
    hget: (op1?: any, op2?: any, op3?: any) => Promise<string>;
    hgetall: (op1?: any, op2?: any, op3?: any) => Promise<any>;
    hincrby: (op1?: any, op2?: any, op3?: any) => Promise<any>;
    hset: (op1?: any, op2?: any, op3?: any) => Promise<any>;
    incr: (op1?: any, op2?: any, op3?: any) => Promise<any>;
    prefix: string;
    set: (op1?: any, op2?: any, op3?: any) => Promise<any>;
    setex: (op1?: any, op2?: any, op3?: any) => Promise<any>;
    willCache: boolean;
    constructor(firebaseConfig?: Config, client?: RedisClient);
}
