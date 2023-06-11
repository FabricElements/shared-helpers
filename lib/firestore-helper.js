var _a;
import { getFirestore } from 'firebase-admin/firestore';
/**
 * Use FirestoreHelper to get firestore documents
 */
export class FirestoreHelper {
}
_a = FirestoreHelper;
/**
 * Validate if document exists
 *
 * @param {InterfaceFirestoreDocument} options
 */
FirestoreHelper.exists = async (options) => {
    const snap = await _a._getDocument(options);
    return snap.exists;
};
/**
 * Get Document
 * @param {InterfaceFirestoreDocument} options
 * @return {Promise<DocumentData>}
 */
FirestoreHelper.getDocument = async (options) => _a._getDocumentSnap(options);
/**
 * Get list
 * @param {InterfaceFirestoreQuery} options
 * @return {Promise<DocumentData[]>}
 */
FirestoreHelper.getList = async (options) => {
    const references = await _a.getListRef(options);
    const data = [];
    for (let i = 0; i < references.length; i++) {
        const ref = references[i];
        const docData = await _a._getDocumentSnap({ reference: ref });
        data.push(docData);
    }
    return data;
};
/**
 * Get List reference for later use
 * @param {InterfaceFirestoreQuery} options
 * @return {Query}
 */
FirestoreHelper.getListReference = (options) => {
    if (!(options.collection || options.collectionGroup)) {
        throw new Error('collection or collectionGroup is required');
    }
    const db = getFirestore();
    let ref;
    if (options.collection)
        ref = db.collection(options.collection);
    if (options.collectionGroup)
        ref = db.collectionGroup(options.collectionGroup);
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
    return ref;
};
/**
 * Get list
 * @param {InterfaceFirestoreQuery} options
 * @return {Promise<string>[]}
 */
FirestoreHelper.getListIds = async (options) => {
    const ref = _a.getListReference(options);
    const snapshot = await ref.get();
    if (!snapshot || !snapshot.docs || snapshot.empty) {
        return [];
    }
    const docs = snapshot.docs;
    return docs.map((doc) => doc.id);
};
/**
 * Get list
 * @param {InterfaceFirestoreQuery} options
 * @return {Promise<DocumentReference>[]}
 */
FirestoreHelper.getListRef = async (options) => {
    const ref = _a.getListReference(options);
    const snapshot = await ref.get();
    if (!snapshot || !snapshot.docs || snapshot.empty) {
        return [];
    }
    const docs = snapshot.docs;
    return docs.map((doc) => doc.ref);
};
/**
 * Count documents on a query
 * @param {InterfaceFirestoreQuery} options
 * @return {Promise<string>[]}
 */
FirestoreHelper.count = async (options) => {
    const ref = _a.getListReference(options);
    const snapshot = await ref.count().get();
    if (!snapshot)
        return 0;
    return snapshot.data().count;
};
/**
 * Get document instance from firestore
 *
 * @param {InterfaceFirestoreDocument} options
 * @return {Promise<Promise<FirebaseFirestore.DocumentSnapshot>>}
 * @private
 */
FirestoreHelper._getDocument = (options) => {
    // Get from Reference
    if (options.reference)
        return options.reference.get();
    // Get From collection and document
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
 * @param {InterfaceFirestoreDocument} options
 * @return {Promise<DocumentData>}
 * @private
 */
FirestoreHelper._getDocumentSnap = async (options) => {
    const snap = await _a._getDocument(options);
    if (!snap.exists) {
        if (options.reference)
            throw new Error(`Not found ${options.reference.path}`);
        throw new Error(`Not found ${options.collection}/${options.document}`);
    }
    return {
        ...snap.data(),
        id: options.document,
    };
};
//# sourceMappingURL=firestore-helper.js.map