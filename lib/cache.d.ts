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
    del: (op1?: any, op2?: any, op3?: any) => Promise<void>;
    exists: (op1?: any, op2?: any, op3?: any) => Promise<void>;
    flushall: (op1?: any, op2?: any, op3?: any) => Promise<void>;
    flushdb: (op1?: any, op2?: any, op3?: any) => Promise<void>;
    get: (op1?: any, op2?: any, op3?: any) => Promise<void>;
    hdel: (op1?: any, op2?: any, op3?: any) => Promise<void>;
    hexists: (op1?: any, op2?: any, op3?: any) => Promise<void>;
    hget: (op1?: any, op2?: any, op3?: any) => Promise<void>;
    hgetall: (op1?: any, op2?: any, op3?: any) => Promise<void>;
    hincrby: (op1?: any, op2?: any, op3?: any) => Promise<void>;
    hset: (op1?: any, op2?: any, op3?: any) => Promise<void>;
    incr: (op1?: any, op2?: any, op3?: any) => Promise<void>;
    prefix: string;
    set: (op1?: any, op2?: any, op3?: any) => Promise<void>;
    setex: (op1?: any, op2?: any, op3?: any) => Promise<void>;
    willCache: boolean;
    constructor(firebaseConfig?: Config, client?: RedisClient);
}
