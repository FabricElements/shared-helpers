/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import * as admin from "firebase-admin";
import {ClientOpts, RedisClient} from "redis";
import {Tedis} from "tedis";

/**
 * Use FirestoreHelper to get firestore documents from redis cache
 */
export class FirestoreHelper {
  public canCache: boolean = false;
  public logs: boolean = false;
  public prefix: string = null;
  redisClient: Tedis;

  /**
   * Constructor
   * @param config
   */
  constructor(config?: {
    host?: string;
    logs?: boolean;
    port?: number;
    [key: string]: any
  }) {
    if (config && Object.keys(config).length > 0) {
      const redisHost = config.host;
      const redisPort = Number(config.port);
      this.logs = !!config.logs;
      if (redisHost && redisPort) {
        let clientOpts: ClientOpts = config;
        clientOpts.port = redisPort;
        this.prefix = clientOpts?.prefix ?? null;
        const redis = new RedisClient(clientOpts);
        const connected = redis.connected;
        if (connected) {
          this.redisClient = new Tedis(clientOpts);
          this.canCache = true;
        }
      }
    }
  }

  /**
   * Validate if document exists
   *
   * @param options
   */
  public existDocument: (options: { collection: string; document: string }) => Promise<boolean> = async (options) => {
    const snap = await this._getDocument({
      collection: options.collection,
      document: options.document,
    });
    return snap.exists;
  };

  /**
   * Get Document
   * @param options
   */
  public getDocument: (options: {
    cache?: boolean;
    cacheLimit?: number;
    collection: string;
    document: string;
  }) => Promise<FirebaseFirestore.DocumentData> = async (options) => {
    let cachePath = this.prefix ? `${this.prefix}:` : "";
    cachePath += `${options.collection}:${options.document}`;
    const cacheData = {
      cache: false,
      cacheCalls: 0,
      cachePath,
    };
    let data: FirebaseFirestore.DocumentData = {};
    const willCache = options.cache && this.canCache;
    if (willCache) {
      try {
        const requestData = await this.redisClient.get(cachePath);
        if (!requestData) {
          // noinspection ExceptionCaughtLocallyJS
          throw new Error("Key not found");
        }
        const request = JSON.parse(requestData.toString());
        const cacheCalls = request.cacheCalls ? Number(request.cacheCalls) + 1 : 1;
        const cacheLimit = cacheCalls > options.cacheLimit;
        if (cacheLimit) {
          // noinspection ExceptionCaughtLocallyJS
          throw new Error("Cache limit reached");
        }
        data = {
          ...request,
          ...cacheData,
          cacheCalls,
          cache: true,
        };
      } catch (error) {
        if (this.logs) {
          switch (error.message) {
            case "Key not found":
            case "Cache limit reached":
              console.log(error.message);
              break;
            default:
              console.log("Created after:", error.message);
          }
        }
      }
    }
    if (Object.keys(data).length === 0) {
      const baseData = await this._getDocumentSnap({
        collection: options.collection,
        document: options.document,
      });
      data = {...baseData, ...cacheData};
    }
    if (willCache) {
      await this.redisClient.setex(cachePath, 86400, JSON.stringify(data)); // Cached for 24 hours
    } else {
      delete data.cacheCalls;
      delete data.cachePath;
      delete data.cache;
    }
    return data;
  };

  /**
   * Get list
   * @param options
   */
  public getList: (options: {
    cache?: boolean;
    cacheLimit?: number;
    collection: string;
    limit?: number;
    orderBy?: { direction: FirebaseFirestore.OrderByDirection; key: string }[];
    where?: { field: string | FirebaseFirestore.FieldPath; filter: FirebaseFirestore.WhereFilterOp; value: any }[]
  }) => Promise<FirebaseFirestore.DocumentData[]> = async (options) => {
    const ids = await this.getListIds({
      collection: options.collection,
      limit: options.limit,
      orderBy: options.orderBy,
      where: options.where,
    });
    let data: FirebaseFirestore.DocumentData[] = [];
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      const docData = await this.getDocument({
        cache: options.cache,
        cacheLimit: options.cacheLimit,
        collection: options.collection,
        document: id,
      });
      data.push(docData);
    }
    return data;
  };

  /**
   * Get list
   * @param options
   * @return {Promise<string>[]}
   */
  public getListIds: (options: {
    collection: string;
    limit?: number;
    orderBy?: { direction: FirebaseFirestore.OrderByDirection; key: string }[];
    where?: { field: string | FirebaseFirestore.FieldPath; filter: FirebaseFirestore.WhereFilterOp; value: any }[]
  }) => Promise<string[]> = async (options) => {
    if (!options.collection) {
      throw new Error("collection is undefined");
    }
    const db = admin.firestore();
    let ref: any = db.collection(options.collection);
    const orderBy = options.orderBy;
    if (orderBy && orderBy.length > 0) {
      for (let i = 0; i < orderBy.length; i++) {
        const item = orderBy[i];
        ref = ref.orderBy(item.key, item.direction);
      }
    }
    const where = options.where;
    if (where && where.length > 0) {
      for (let i = 0; i < where.length; i++) {
        const item = where[i];
        ref = ref.where(item.field, item.filter, item.value);
      }
    }
    if (options.limit) {
      ref = ref.limit(options.limit);
    }
    const snapshot = await ref.get();
    if (!snapshot || !snapshot.docs || snapshot.empty) {
      return [];
    }
    const docs = snapshot.docs;
    return docs.map((doc) => doc.id);
  };

  /**
   * Get list size
   * @param options
   * @return {Promise<string>[]}
   */
  public getListSize: (options: {
    collection: string,
    limit?: number,
    orderBy?: {
      direction: FirebaseFirestore.OrderByDirection,
      key: string,
    }[],
    where?: {
      field: string | FirebaseFirestore.FieldPath,
      filter: FirebaseFirestore.WhereFilterOp,
      value: any,
    }[],
  }) => Promise<number> = async (options) => {
    if (!options.collection) {
      throw new Error("collection is undefined");
    }
    const db = admin.firestore();
    let ref: any = db.collection(options.collection);
    const orderBy = options.orderBy;
    if (orderBy && orderBy.length > 0) {
      for (let i = 0; i < orderBy.length; i++) {
        const item = orderBy[i];
        ref = ref.orderBy(item.key, item.direction);
      }
    }
    const where = options.where;
    if (where && where.length > 0) {
      for (let i = 0; i < where.length; i++) {
        const item = where[i];
        ref = ref.where(item.field, item.filter, item.value);
      }
    }
    if (options.limit) {
      ref = ref.limit(options.limit);
    }
    const snapshot = await ref.get();
    if (!snapshot || !snapshot.docs || snapshot.empty) {
      return 0;
    }
    return snapshot.size;
  };

  /**
   * Get document instance from firestore
   *
   * @param options
   * @private
   */
  private _getDocument: (options: {
    collection: string;
    document: string;
  }) => Promise<FirebaseFirestore.DocumentSnapshot<FirebaseFirestore.DocumentData>> = async (options) => {
    if (!options.collection) {
      throw new Error("Missing collection");
    }
    if (!options.document) {
      throw new Error("Missing document id");
    }
    const db = admin.firestore();
    const ref = db.collection(options.collection).doc(options.document);
    return ref.get();
  };

  /**
   * Get document snapshot from firestore
   *
   * @param options
   * @private
   */
  private _getDocumentSnap: (options: { collection: string; document: string }) => Promise<FirebaseFirestore.DocumentData> = async (options) => {
    const snap = await this._getDocument({
      collection: options.collection,
      document: options.document,
    });
    if (!snap.exists) {
      throw new Error(`Not found ${options.collection}/${options.document}`);
    }
    let data = snap.data();
    data.id = options.document;
    return data;
  };
}
