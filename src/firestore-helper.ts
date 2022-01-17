/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import type FirebaseFirestore from '@google-cloud/firestore';
import {getFirestore} from 'firebase-admin/firestore';

import type {RedisClientOptions} from 'redis';
import {createClient} from 'redis';
import {Tedis} from 'tedis';

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
   * @param {any} config
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
        const clientOpts: RedisClientOptions<any, any> = {
          socket: {
            port: redisPort,
            host: redisHost,
          },
        };
        config.port = redisPort;
        this.prefix = config?.prefix ?? null;
        // eslint-disable-next-line no-unused-vars
        const redis = createClient(clientOpts);
        // const connected = redis.connected;
        const connected = false;
        if (connected) {
          this.redisClient = new Tedis({host: config.host, port: config.port});
          this.canCache = true;
        }
      }
    }
  }

  /**
   * Validate if document exists
   *
   * @param {any} options
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
   * @param {any} options
   * @return {Promise<FirebaseFirestore.DocumentData>}
   */
  public getDocument = async (options: {
    cache?: boolean;
    cacheLimit?: number;
    collection: string;
    document: string;
  }) => {
    let cachePath = this.prefix ? `${this.prefix}:` : '';
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
          throw new Error('Key not found');
        }
        const request = JSON.parse(requestData.toString());
        const cacheCalls = request.cacheCalls ? Number(request.cacheCalls) + 1 : 1;
        const cacheLimit = cacheCalls > options.cacheLimit;
        if (cacheLimit) {
          // noinspection ExceptionCaughtLocallyJS
          throw new Error('Cache limit reached');
        }
        data = {
          ...request,
          ...cacheData,
          cacheCalls,
          cache: true,
        };
      } catch (error) {
        if (this.logs) {
          // @ts-ignore
          switch (error.message) {
            case 'Key not found':
            case 'Cache limit reached':
              // @ts-ignore
              console.log(error.message);
              break;
            default:
              // @ts-ignore
              console.log('Created after:', error.message);
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
   * @param {any} options
   * @return {Promise<FirebaseFirestore.DocumentData[]>}
   */
  public getList = async (options: {
    cache?: boolean;
    cacheLimit?: number;
    collection: string;
    limit?: number;
    orderBy?: { direction: FirebaseFirestore.OrderByDirection; key: string }[];
    where?: { field: string | FirebaseFirestore.FieldPath; filter: FirebaseFirestore.WhereFilterOp; value: any }[]
  }) => {
    const ids = await this.getListIds({
      collection: options.collection,
      limit: options.limit,
      orderBy: options.orderBy,
      where: options.where,
    });
    const data: FirebaseFirestore.DocumentData[] = [];
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
   * @param {any} options
   * @return {Promise<string>[]}
   */
  public getListIds = async (options: {
    collection: string;
    limit?: number;
    orderBy?: { direction: FirebaseFirestore.OrderByDirection; key: string }[];
    where?: { field: string | FirebaseFirestore.FieldPath; filter: FirebaseFirestore.WhereFilterOp; value: any }[]
  }) => {
    if (!options.collection) {
      throw new Error('collection is undefined');
    }
    const db = getFirestore();
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
   * @param {any} options
   * @return {Promise<string>[]}
   */
  public getListSize = async (options: {
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
  }) => {
    if (!options.collection) {
      throw new Error('collection is undefined');
    }
    const db = getFirestore();
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
   * @param {any} options
   * @return {Promise<FirebaseFirestore.DocumentSnapshot<FirebaseFirestore.DocumentData>>}
   * @private
   */
  private _getDocument = (options: {
    collection: string;
    document: string;
  }) => {
    if (!options.collection) {
      throw new Error('Missing collection');
    }
    if (!options.document) {
      throw new Error('Missing document id');
    }
    const db = getFirestore();
    const ref = db.collection(options.collection).doc(options.document);
    return ref.get();
  };

  /**
   * Get document snapshot from firestore
   *
   * @param {any} options
   * @return {Promise<FirebaseFirestore.DocumentData>}
   * @private
   */
  private _getDocumentSnap = async (options: { collection: string; document: string }) => {
    const snap = await this._getDocument({
      collection: options.collection,
      document: options.document,
    });
    if (!snap.exists) {
      throw new Error(`Not found ${options.collection}/${options.document}`);
    }
    const data = snap.data();
    data.id = options.document;
    return data;
  };
}
