/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import {config} from "firebase-functions";
import {createClient, RedisClient} from "redis";
import {promisify} from "util";
import Config = config.Config;

const redisClient = createClient();

interface InterfaceConfig {
  redis: {
    host: string,
    port: string | number,
    prefix: string,
  }
}

/**
 * Cache
 */
export class Cache {
  client: RedisClient;
  config: Config;
  public prefix: string;

  constructor(firebaseConfig: Config, client: RedisClient = redisClient) {
    this.config = firebaseConfig;
    this.client = client;
    this.prefix = firebaseConfig?.redis?.prefix ?? "";
  }

  public async(action: any) {
    return promisify(action).bind(this.client);
  }
}
