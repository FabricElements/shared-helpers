/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import * as admin from "firebase-admin";
import {config} from "firebase-functions";
import {RedisClient} from "redis";
import {Cache} from "./cache";
import Config = config.Config;

const projectId: string = String(process?.env?.GCLOUD_PROJECT);
const isBeta = projectId.search("beta") >= 0;

export class FirestoreHelper extends Cache {
  constructor(firebaseConfig: Config = {}, client?: RedisClient) {
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
    let cachePath = this.prefix ? `${this.prefix}:` : "";
    cachePath += `${options.collection}:${options.document}`;
    const cacheData = {
      cache: false,
      cacheCalls: 0,
      cachePath,
    };
    let data: any = {};
    const willCache = options.cache && this.willCache;
    if (willCache) {
      try {
        const requestData = await this.get(cachePath);
        if (!requestData) {
          throw new Error("Key not found");
        }
        const request = JSON.parse(requestData);
        const cacheCalls = request.cacheCalls ? Number(request.cacheCalls) + 1 : 1;
        const cacheLimit = cacheCalls > options.cacheLimit;
        if (cacheLimit) {
          throw new Error("Cache limit reached");
        }
        data = {
          ...request,
          ...cacheData,
          cacheCalls,
          cache: true,
        };
      } catch (error) {
        if (isBeta) {
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
      await this.setex(cachePath, 600, JSON.stringify(data));
    }
    return data;
  };

  /**
   * Get list
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
    }[],
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
   * Get list
   * @param {any} options
   * @return {Promise<string>[]}
   */
  public getListIds = async (options: {
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
  }): Promise<string[]> => {
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
  }): Promise<number> => {
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
