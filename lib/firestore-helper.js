"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FirestoreHelper = void 0;
/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
const admin = __importStar(require("firebase-admin"));
const redis_1 = require("redis");
const tedis_1 = require("tedis");
/**
 * Use FirestoreHelper to get firestore documents from redis cache
 */
class FirestoreHelper {
    /**
     * Constructor
     * @param config
     */
    constructor(config) {
        var _a;
        this.canCache = false;
        this.logs = false;
        this.prefix = null;
        /**
         * Validate if document exists
         *
         * @param options
         */
        this.existDocument = (options) => __awaiter(this, void 0, void 0, function* () {
            const snap = yield this._getDocument({
                collection: options.collection,
                document: options.document,
            });
            return snap.exists;
        });
        /**
         * Get Document
         * @param options
         */
        this.getDocument = (options) => __awaiter(this, void 0, void 0, function* () {
            let cachePath = this.prefix ? `${this.prefix}:` : "";
            cachePath += `${options.collection}:${options.document}`;
            const cacheData = {
                cache: false,
                cacheCalls: 0,
                cachePath,
            };
            let data = {};
            const willCache = options.cache && this.canCache;
            if (willCache) {
                try {
                    const requestData = yield this.redisClient.get(cachePath);
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
                    data = Object.assign(Object.assign(Object.assign({}, request), cacheData), { cacheCalls, cache: true });
                }
                catch (error) {
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
                const baseData = yield this._getDocumentSnap({
                    collection: options.collection,
                    document: options.document,
                });
                data = Object.assign(Object.assign({}, baseData), cacheData);
            }
            if (willCache) {
                yield this.redisClient.setex(cachePath, 86400, JSON.stringify(data)); // Cached for 24 hours
            }
            else {
                delete data.cacheCalls;
                delete data.cachePath;
                delete data.cache;
            }
            return data;
        });
        /**
         * Get list
         * @param options
         */
        this.getList = (options) => __awaiter(this, void 0, void 0, function* () {
            const ids = yield this.getListIds({
                collection: options.collection,
                limit: options.limit,
                orderBy: options.orderBy,
                where: options.where,
            });
            let data = [];
            for (let i = 0; i < ids.length; i++) {
                const id = ids[i];
                const docData = yield this.getDocument({
                    cache: options.cache,
                    cacheLimit: options.cacheLimit,
                    collection: options.collection,
                    document: id,
                });
                data.push(docData);
            }
            return data;
        });
        /**
         * Get list
         * @param options
         * @return {Promise<string>[]}
         */
        this.getListIds = (options) => __awaiter(this, void 0, void 0, function* () {
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
            const snapshot = yield ref.get();
            if (!snapshot || !snapshot.docs || snapshot.empty) {
                return [];
            }
            const docs = snapshot.docs;
            return docs.map((doc) => doc.id);
        });
        /**
         * Get list size
         * @param options
         * @return {Promise<string>[]}
         */
        this.getListSize = (options) => __awaiter(this, void 0, void 0, function* () {
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
            const snapshot = yield ref.get();
            if (!snapshot || !snapshot.docs || snapshot.empty) {
                return 0;
            }
            return snapshot.size;
        });
        /**
         * Get document instance from firestore
         *
         * @param options
         * @private
         */
        this._getDocument = (options) => __awaiter(this, void 0, void 0, function* () {
            if (!options.collection) {
                throw new Error("Missing collection");
            }
            if (!options.document) {
                throw new Error("Missing document id");
            }
            const db = admin.firestore();
            const ref = db.collection(options.collection).doc(options.document);
            return ref.get();
        });
        /**
         * Get document snapshot from firestore
         *
         * @param options
         * @private
         */
        this._getDocumentSnap = (options) => __awaiter(this, void 0, void 0, function* () {
            const snap = yield this._getDocument({
                collection: options.collection,
                document: options.document,
            });
            if (!snap.exists) {
                throw new Error(`Not found ${options.collection}/${options.document}`);
            }
            let data = snap.data();
            data.id = options.document;
            return data;
        });
        if (config && Object.keys(config).length > 0) {
            const redisHost = config.host;
            const redisPort = Number(config.port);
            this.logs = !!config.logs;
            if (redisHost && redisPort) {
                let clientOpts = config;
                clientOpts.port = redisPort;
                this.prefix = (_a = clientOpts === null || clientOpts === void 0 ? void 0 : clientOpts.prefix) !== null && _a !== void 0 ? _a : null;
                const redis = new redis_1.RedisClient(clientOpts);
                const connected = redis.connected;
                if (connected) {
                    this.redisClient = new tedis_1.Tedis(clientOpts);
                    this.canCache = true;
                }
            }
        }
    }
}
exports.FirestoreHelper = FirestoreHelper;
//# sourceMappingURL=firestore-helper.js.map