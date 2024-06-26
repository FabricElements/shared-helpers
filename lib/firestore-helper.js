// noinspection JSUnusedGlobalSymbols
import { getFirestore } from 'firebase-admin/firestore';
export var FirestoreHelper;
(function (FirestoreHelper) {
    var _a;
    /**
     * Use FirestoreHelper to get firestore documents
     */
    class Helper {
    }
    _a = Helper;
    /**
     * Validate if document exists
     *
     * @param {InterfaceFirestoreDocument} options
     */
    Helper.exists = async (options) => {
        const snap = await _a._getDocument(options);
        return snap.exists;
    };
    /**
     * Get Document
     * @param {InterfaceFirestoreDocument} options
     * @return {Promise<DocumentData>}
     */
    Helper.getDocument = async (options) => _a._getDocumentSnap(options);
    /**
     * Get list
     * @param {InterfaceFirestoreQuery} options
     * @return {Promise<DocumentData[]>}
     */
    Helper.getList = async (options) => {
        const references = await _a.getListRef(options);
        let data = [];
        for (const ref of references) {
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
    Helper.getListReference = (options) => {
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
            for (const item of orderBy) {
                ref = ref.orderBy(item.key, item.direction);
            }
        }
        const where = options.where;
        if (where && where.length > 0) {
            for (const item of where) {
                ref = ref.where(item.field, item.operator, item.value);
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
    Helper.getListIds = async (options) => {
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
     * @return {Promise<DocumentReference[]>}
     */
    Helper.getListRef = async (options) => {
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
     * @return {Promise<number>}
     */
    Helper.count = async (options) => {
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
     * @return {Promise<FirebaseFirestore.DocumentSnapshot>}
     * @private
     */
    Helper._getDocument = (options) => {
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
    Helper._getDocumentSnap = async (options) => {
        const snap = await _a._getDocument(options);
        if (!snap.exists) {
            if (options.reference)
                throw new Error(`Not found ${options.reference.path}`);
            throw new Error(`Not found ${options.collection}/${options.document}`);
        }
        return {
            ...snap.data(),
            id: snap.id,
        };
    };
    FirestoreHelper.Helper = Helper;
})(FirestoreHelper || (FirestoreHelper = {}));
//# sourceMappingURL=firestore-helper.js.map