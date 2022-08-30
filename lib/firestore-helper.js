/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import { getFirestore } from 'firebase-admin/firestore';
import { createClient } from 'redis';
import { Tedis } from 'tedis';
/**
 * Use FirestoreHelper to get firestore documents from redis cache
 */
export class FirestoreHelper {
    /**
     * Constructor
     * @param {any} config
     */
    constructor(config) {
        this.canCache = false;
        this.logs = false;
        this.prefix = null;
        /**
         * Validate if document exists
         *
         * @param {any} options
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
         * @param {any} options
         * @return {Promise<FirebaseFirestore.DocumentData>}
         */
        this.getDocument = async (options) => {
            let cachePath = this.prefix ? `${this.prefix}:` : '';
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
                }
                catch (error) {
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
                data = { ...baseData, ...cacheData };
            }
            if (willCache) {
                await this.redisClient.setex(cachePath, 86400, JSON.stringify(data)); // Cached for 24 hours
            }
            else {
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
        this.getList = async (options) => {
            const ids = await this.getListIds({
                collection: options.collection,
                limit: options.limit,
                orderBy: options.orderBy,
                where: options.where,
            });
            const data = [];
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
        this.getListIds = async (options) => {
            if (!options.collection) {
                throw new Error('collection is undefined');
            }
            const db = getFirestore();
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
         * Get list size
         * @param {any} options
         * @return {Promise<string>[]}
         */
        this.getListSize = async (options) => {
            if (!options.collection) {
                throw new Error('collection is undefined');
            }
            const db = getFirestore();
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
        this._getDocument = (options) => {
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
        this._getDocumentSnap = async (options) => {
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
        if (config && Object.keys(config).length > 0) {
            const redisHost = config.host;
            const redisPort = Number(config.port);
            this.logs = !!config.logs;
            if (redisHost && redisPort) {
                const clientOpts = {
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
                    this.redisClient = new Tedis({ host: config.host, port: config.port });
                    this.canCache = true;
                }
            }
        }
    }
}
//# sourceMappingURL=firestore-helper.js.map