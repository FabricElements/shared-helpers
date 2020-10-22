/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import {config} from "firebase-functions";
import {RedisClient} from "redis";
import {promisify} from "util";
import Config = config.Config;

const projectId: string = String(process?.env?.GCLOUD_PROJECT);
const isBeta = projectId.search("beta") >= 0;
const baseCall = async (op1?: any, op2?: any, op3?: any): Promise<any> => {
  return;
};
const baseCallString = async (op1?: any, op2?: any, op3?: any): Promise<string> => {
  return;
};

/**
 * Cache
 */
export class Cache {
  client: RedisClient;
  config: Config;
  public del = baseCall;
  public exists = baseCall;
  public flushall = baseCall;
  public flushdb = baseCall;
  public get = baseCallString;
  public hdel = baseCall;
  public hexists = baseCall;
  public hget = baseCallString;
  public hgetall = baseCall;
  public hincrby = baseCall;
  public hset = baseCall;
  public incr = baseCall;
  public prefix: string;
  public set = baseCall;
  public setex = baseCall;
  public willCache: boolean = false;

  constructor(firebaseConfig: Config = {}, client?: RedisClient) {
    try {
      this.config = firebaseConfig;
      this.prefix = firebaseConfig?.redis?.prefix ?? null;
      this.willCache = !isBeta && client && client?.connected;
    } catch (error) {

    }

    if (this.willCache) {
      this.client = client;
      this.del = promisify(client.del).bind(client);
      this.exists = promisify(client.exists).bind(client);
      this.flushdb = promisify(client.flushdb).bind(client);
      this.flushall = promisify(client.flushall).bind(client);
      this.get = promisify(client.get).bind(client);
      this.hget = promisify(client.hget).bind(client);
      this.hgetall = promisify(client.hgetall).bind(client);
      this.hset = promisify(client.hset).bind(client);
      this.hdel = promisify(client.hdel).bind(client);
      this.hincrby = promisify(client.hincrby).bind(client);
      this.hexists = promisify(client.hexists).bind(client);
      this.set = promisify(client.set).bind(client);
      this.setex = promisify(client.setex).bind(client);
      this.incr = promisify(client.incr).bind(client);
    } else {
      if (isBeta) {
        console.warn("Can't get the client from cache");
      }
      return;
    }
  }
}
