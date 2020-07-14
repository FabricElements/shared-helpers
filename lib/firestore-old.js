"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getList = exports.getDocument = exports.existDocument = void 0;
/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
const admin = require("firebase-admin");
/**
 * Exist Document
 * @param collectionId
 * @param documentId
 */
exports.existDocument = async (collectionId, documentId) => {
    if (!documentId) {
        throw new Error("Missing id");
    }
    const db = admin.firestore();
    const ref = db.collection(collectionId).doc(documentId);
    const snap = await ref.get();
    return snap.exists;
};
/**
 * Get Document
 * @param collectionId
 * @param documentId
 */
exports.getDocument = async (collectionId, documentId) => {
    if (!documentId) {
        throw new Error("Missing id");
    }
    const db = admin.firestore();
    const ref = db.collection(collectionId).doc(documentId);
    const snap = await ref.get();
    if (!snap.exists) {
        if (collectionId === "service") {
            throw new Error("Missing service id");
        }
        throw new Error(`Not found ${collectionId}/${documentId}`);
    }
    let data = snap.data();
    data.id = documentId;
    return data;
};
/**
 * Get services list
 * @param {any} options
 */
exports.getList = async (options) => {
    if (!options.collectionId) {
        throw new Error("collectionId is undefined");
    }
    const db = admin.firestore();
    let ref = db.collection(options.collectionId);
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
    if (!options.fullResponse) {
        return docs.map((doc) => doc.id);
    }
    // Return full data only when needed
    return docs.map((doc) => {
        let docData = doc.data();
        docData.id = doc.id;
        return docData;
    });
};
//# sourceMappingURL=firestore-old.js.map