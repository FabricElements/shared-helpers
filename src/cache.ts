/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import {config} from "firebase-functions";
import {RedisClient} from "redis";
import {promisify} from "util";
import Config = config.Config;

/**
 * Cache
 */
export class Cache {
  client: RedisClient;
  config: Config;
  public get = promisify(this.client.get).bind(this.client);
  public incr = promisify(this.client.incr).bind(this.client);
  public prefix: string;
  public set = promisify(this.client.set).bind(this.client);

  constructor(firebaseConfig: Config = {}, client: RedisClient) {
    this.config = firebaseConfig;
    this.client = client;
    this.prefix = firebaseConfig?.redis?.prefix ?? "";
  }
}
