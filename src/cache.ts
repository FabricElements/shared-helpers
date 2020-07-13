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
  public getCache;
  public prefix: string;
  public setCache;

  constructor(firebaseConfig: Config = {}, client: RedisClient) {
    if (!client) {
      throw new Error("Can't get the client from cache");
    }
    this.config = firebaseConfig;
    this.client = client;
    this.prefix = firebaseConfig?.redis?.prefix ?? null;
    if (!this.prefix) {
      throw new Error("redis prefix is required");
    }
    this.getCache = promisify(client.get).bind(client);
    this.setCache = promisify(client.set).bind(client);
  }

  // public get = (options) => promisify(this.client.get).bind(this.client)(options);
  // public incr = (options) => promisify(this.client.incr).bind(this.client)(options);
  // public set = (options) => promisify(this.client.set).bind(this.client)(options);
}
