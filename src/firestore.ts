/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import * as admin from "firebase-admin";
import {config} from "firebase-functions";
import {RedisClient} from "redis";
import {Cache} from "./cache";
import Config = config.Config;

export class FirestoreHelper extends Cache {
  constructor(firebaseConfig: Config, client: RedisClient) {
    super(firebaseConfig, client);
  }

  /**
   * Validate if document exists
   *
   * @param options
   * @returns <Promise<boolean>>
   */
  public existDocument: (options: { collection: string; document: string }) => Promise<boolean> = async (options: {
    collection: string,
    document: string,
  }): Promise<boolean> => {
    const snap = await this._getDocument({
      collection: options.collection,
      document: options.document,
    });
    return snap.exists;
  };

  /**
   * Get Document
   * @param options
   * @return {Promise<any>}
   */
  public getDocument = async (options: {
    cache?: boolean,
    cacheLimit?: number,
    collection: string,
    document: string,
  }): Promise<any> => {
    const cachePath = `${this.prefix}:${options.collection}:${options.document}`;
    const cacheData = {
      cache: false,
      cacheCalls: 0,
      cachePath,
    };
    let data: any = {};
    if (!(options.cache || this.client.connected)) {
      const baseData = await this._getDocumentSnap({
        collection: options.collection,
        document: options.document,
      });
      data = {...baseData, ...cacheData};
    } else {
      try {
        const exists: boolean = await this.hexists(cachePath);
        if (!exists) {
          throw new Error("Key not found");
        }
        await this.hincrby(cachePath, "cacheCalls", 1);
        const requestData = await this.hgetall(cachePath);
        console.log(typeof requestData, requestData);
        data = typeof requestData === "object" ? requestData : JSON.parse(requestData);
        const cacheCalls = Number(data.cacheCalls);
        const cacheLimit = cacheCalls > options.cacheLimit;
        if (cacheLimit) {
          throw new Error("Cache limit reached");
        }
        // data = {
        //   ...request,
        //   ...cacheData,
        //   cacheCalls,
        //   cache: true,
        // };
        // await this.hset(cachePath, JSON.stringify(data));
      } catch (error) {
        if (error.message !== "Key not found") {
          console.warn(error.message);
        } else {
          console.log("Created after:", error.message);
        }
        const baseData = await this._getDocumentSnap({
          collection: options.collection,
          document: options.document,
        });
        data = {...baseData, ...cacheData, cache: true};
        await this.hset(cachePath, ...data);
        // await this.hset(cachePath, JSON.stringify(data));
      }
    }
    return data;
  };

  /**
   * Get services list
   * @param {any} options
   * @return {Promise<any>[]}
   */
  public getList = async (options: {
    cache?: boolean,
    cacheLimit?: number,
    collection: string,
    limit?: number,
    orderBy?: {
      direction: FirebaseFirestore.OrderByDirection,
      key: string,
    },
    where?: {
      field: string | FirebaseFirestore.FieldPath,
      filter: FirebaseFirestore.WhereFilterOp,
      value: any,
    }[],
  }): Promise<any[]> => {
    const ids: string[] = await this.getListIds({
      collection: options.collection,
      limit: options.limit,
      orderBy: options.orderBy,
      where: options.where,
    });
    let data: any[] = [];
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
   * Get services list
   * @param {any} options
   * @return {Promise<string>[]}
   */
  public getListIds = async (options: {
    collection: string,
    limit?: number,
    orderBy?: {
      direction: FirebaseFirestore.OrderByDirection,
      key: string,
    },
    where?: {
      field: string | FirebaseFirestore.FieldPath,
      filter: FirebaseFirestore.WhereFilterOp,
      value: any,
    }[],
  }): Promise<string[]> => {
    if (!options.collection) {
      throw new Error("collection is undefined");
    }
    const db = admin.firestore();
    let ref: any = db.collection(options.collection);
    if (options.orderBy) {
      ref = ref.orderBy(options.orderBy.key, options.orderBy.direction);
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
   * Get document instance from firestore
   *
   * @param options
   * @private
   */
  private _getDocument = async (options: {
    collection: string,
    document: string,
  }) => {
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
  private _getDocumentSnap: any = async (options: {
    collection: string,
    document: string,
  }): Promise<any> => {
    const snap = await this._getDocument({
      collection: options.collection,
      document: options.document,
    });
    if (!snap.exists) {
      throw new Error(`Not found ${options.collection}/${options.document}`);
    }
    let data: any = snap.data();
    data.id = options.document;
    return data;
  };
}
