"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FirestoreHelper = void 0;
/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
const admin = require("firebase-admin");
const cache_1 = require("./cache");
class FirestoreHelper extends cache_1.Cache {
    constructor(firebaseConfig, client) {
        super(firebaseConfig, client);
        /**
         * Validate if document exists
         *
         * @param options
         * @returns <Promise<boolean>>
         */
        this.existDocument = async (options) => {
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
        this.getDocument = async (options) => {
            const cachePath = `${this.prefix}:${options.collection}:${options.document}`;
            const cacheData = {
                cache: false,
                cacheCalls: 0,
                cachePath,
            };
            let data = {};
            if (!(options.cache || this.client.connected)) {
                const baseData = await this._getDocumentSnap({
                    collection: options.collection,
                    document: options.document,
                });
                data = { ...baseData, ...cacheData };
            }
            else {
                try {
                    const exists = await this.hexists(cachePath);
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
                }
                catch (error) {
                    if (error.message !== "Key not found") {
                        console.warn(error.message);
                    }
                    else {
                        console.log("Created after:", error.message);
                    }
                    const baseData = await this._getDocumentSnap({
                        collection: options.collection,
                        document: options.document,
                    });
                    data = { ...baseData, ...cacheData, cache: true };
                    await this.hset(cachePath, data);
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
        this.getList = async (options) => {
            const ids = await this.getListIds({
                collection: options.collection,
                limit: options.limit,
                orderBy: options.orderBy,
                where: options.where,
            });
            let data = [];
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
        this.getListIds = async (options) => {
            if (!options.collection) {
                throw new Error("collection is undefined");
            }
            const db = admin.firestore();
            let ref = db.collection(options.collection);
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
        this._getDocument = async (options) => {
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
        this._getDocumentSnap = async (options) => {
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
}
exports.FirestoreHelper = FirestoreHelper;
//# sourceMappingURL=firestore.js.map