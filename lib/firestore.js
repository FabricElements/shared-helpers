"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FirestoreHelper = void 0;
/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
const admin = require("firebase-admin");
const cache_1 = require("./cache");
const projectId = String((_a = process === null || process === void 0 ? void 0 : process.env) === null || _a === void 0 ? void 0 : _a.GCLOUD_PROJECT);
const isBeta = projectId.search("beta") >= 0;
class FirestoreHelper extends cache_1.Cache {
    constructor(firebaseConfig = {}, client) {
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
            var _a;
            const cachePath = `${this.prefix}:${options.collection}:${options.document}`;
            const cacheData = {
                cache: false,
                cacheCalls: 0,
                cachePath,
            };
            let data = {};
            const willCache = options.cache && ((_a = this.client) === null || _a === void 0 ? void 0 : _a.connected);
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
                }
                catch (error) {
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
                data = { ...baseData, ...cacheData };
            }
            if (willCache) {
                await this.setex(cachePath, 600, JSON.stringify(data));
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