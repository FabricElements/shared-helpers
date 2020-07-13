"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getList = exports.getListIds = exports.getDocument = exports.existDocument = void 0;
/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
const admin = require("firebase-admin");
const functions = require("firebase-functions");
const cache_1 = require("./cache");
const config = functions.config();
const prefix = config.redis.prefix;
/**
 * Get document instance from firestore
 *
 * @param options
 * @private
 */
const _getDocument = async (options) => {
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
const _getDocumentSnap = async (options) => {
    const snap = await _getDocument({
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
/**
 * Validate if document exists
 *
 * @param options
 * @returns <Promise<boolean>>
 */
exports.existDocument = async (options) => {
    const snap = await _getDocument({
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
exports.getDocument = async (options) => {
    const cachePath = `${prefix}/${options.collection}/${options.document}`;
    const cacheData = {
        cache: false,
        cacheCalls: 0,
        cachePath,
    };
    let data = {};
    if (!(options.cache || cache_1.client.connected)) {
        const baseData = await _getDocumentSnap({
            collection: options.collection,
            document: options.document,
        });
        data = { ...baseData, ...cacheData };
    }
    else {
        try {
            const requestData = await cache_1.rget(cachePath);
            if (!requestData) {
                throw new Error("Key not found");
            }
            const request = JSON.parse(requestData);
            const cacheCalls = request.cacheCalls ? Number(request.cacheCalls) + 1 : 1;
            data = {
                ...request,
                ...cacheData,
                cacheCalls,
                cache: true,
            };
            await cache_1.rset(cachePath, JSON.stringify(data));
        }
        catch (error) {
            const baseData = await _getDocumentSnap({
                collection: options.collection,
                document: options.document,
            });
            data = { ...baseData, ...cacheData, cache: true };
            await cache_1.rset(cachePath, JSON.stringify(data));
        }
    }
    return data;
};
/**
 * Get services list
 * @param {any} options
 * @return {Promise<string>[]}
 */
exports.getListIds = async (options) => {
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
 * Get services list
 * @param {any} options
 * @return {Promise<any>[]}
 */
exports.getList = async (options) => {
    const ids = await exports.getListIds({
        collection: options.collection,
        limit: options.limit,
        orderBy: options.orderBy,
        where: options.where,
    });
    let data = [];
    for (let i = 0; i < ids.length; i++) {
        const id = ids[i];
        const docData = await exports.getDocument({
            cache: options.cache,
            cacheClear: options.cacheClear,
            collection: options.collection,
            document: id,
        });
        data.push(docData);
    }
    return data;
};
//# sourceMappingURL=firestore.js.map