var _a;
import { getFirestore } from 'firebase-admin/firestore';
/**
 * Use FirestoreHelper to get firestore documents
 */
class FirestoreHelper {
}
_a = FirestoreHelper;
/**
 * Validate if document exists
 *
 * @param {InterfaceFirestoreDocument} options
 */
FirestoreHelper.exists = async (options) => {
    const snap = await _a._getDocument({
        collection: options.collection,
        document: options.document,
    });
    return snap.exists;
};
/**
 * Get Document
 * @param {InterfaceFirestoreDocument} options
 * @return {Promise<DocumentData>}
 */
FirestoreHelper.getDocument = async (options) => await _a._getDocumentSnap({
    collection: options.collection,
    document: options.document,
});
/**
 * Get list
 * @param {InterfaceFirestoreQuery} options
 * @return {Promise<DocumentData[]>}
 */
FirestoreHelper.getList = async (options) => {
    const ids = await _a.getListIds({
        collection: options.collection,
        limit: options.limit,
        orderBy: options.orderBy,
        where: options.where,
    });
    const data = [];
    for (let i = 0; i < ids.length; i++) {
        const id = ids[i];
        const docData = await _a.getDocument({
            collection: options.collection,
            document: id,
        });
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
 * @return {Promise<Promise<DocumentSnapshot>>}
 * @private
 */
FirestoreHelper._getDocument = (options) => {
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
    const snap = await _a._getDocument({
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
export { FirestoreHelper };
//# sourceMappingURL=firestore-helper.js.map