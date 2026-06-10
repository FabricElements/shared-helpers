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
     * Checks whether a Firestore document exists without fetching its data.
     *
     * @param {InterfaceFirestoreDocument} options - Document address options (`collection`/`document` pair or
     *   a `DocumentReference`).
     * @returns {Promise<boolean>} A Promise resolving to `true` if the document exists, `false`
     *   otherwise.
     */
    Helper.exists = async (options) => {
        const snap = await _a._getDocument(options);
        return snap.exists;
    };
    /**
     * Fetches a single Firestore document and returns its data merged with its ID.
     *
     * @param {InterfaceFirestoreDocument} options - Document address options.
     * @returns {Promise<DocumentData>} A Promise resolving to the document's data object, with the
     *   Firestore document ID injected as an `id` field.
     * @throws {Error} If the document does not exist.
     */
    Helper.getDocument = async (options) => _a._getDocumentSnap(options);
    /**
     * Fetches all documents matching a Firestore query and returns their data.
     *
     * Internally resolves the query to document references and fetches each
     * one individually, merging document IDs into each result.
     *
     * @param {InterfaceFirestoreQuery} options - Query descriptor including collection, filters,
     *   ordering, and limit.
     * @returns {Promise<DocumentData[]>} A Promise resolving to an array of document data objects.
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
     * Builds and returns a Firestore `Query` object for later execution.
     *
     * Applies `orderBy`, `where`, and `limit` clauses from the options to the
     * base collection or collection-group reference.  The caller is responsible
     * for executing the returned query.
     *
     * @param {InterfaceFirestoreQuery} options - Query descriptor; `collection` or
     *   `collectionGroup` is required.
     * @returns {Query} A configured Firestore `Query` instance ready to be executed.
     * @throws {Error} If neither `collection` nor `collectionGroup` is provided.
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
     * Returns the Firestore document IDs of all documents matching a query.
     *
     * @param {InterfaceFirestoreQuery} options - Query descriptor.
     * @returns {Promise<string[]>} A Promise resolving to an array of document ID strings, or an
     *   empty array when no documents match.
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
     * Returns `DocumentReference` instances for all documents matching a query.
     *
     * Useful when callers need references for subsequent write operations
     * (e.g., batch updates or deletes) without fetching document data.
     *
     * @param {InterfaceFirestoreQuery} options - Query descriptor.
     * @returns {Promise<DocumentReference[]>} A Promise resolving to an array of `DocumentReference`
     *   objects, or an empty array when no documents match.
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
     * Returns the total number of documents matching a Firestore query using
     * the Firestore server-side `count()` aggregation, which avoids
     * downloading document data.
     *
     * @param {InterfaceFirestoreQuery} options - Query descriptor.
     * @returns {Promise<number>} A Promise resolving to the integer count of matching documents,
     *   or `0` when the aggregation snapshot is unavailable.
     */
    Helper.count = async (options) => {
        const ref = _a.getListReference(options);
        const snapshot = await ref.count().get();
        if (!snapshot)
            return 0;
        return snapshot.data().count;
    };
    /**
     * Retrieves the raw `DocumentSnapshot` for a single Firestore document.
     *
     * Accepts either a direct `DocumentReference` or a `collection`/`document`
     * pair.  Does not throw when the document is missing — callers must check
     * `snap.exists` themselves.
     *
     * @param {InterfaceFirestoreDocument} options - Document address options.
     * @returns {Promise<DocumentSnapshot>} A Promise resolving to the `DocumentSnapshot`.
     * @throws {Error} If `collection` or `document` is absent and no `reference` is supplied.
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
     * Fetches a Firestore document and returns its data merged with the document ID.
     *
     * Delegates to `_getDocument` for the snapshot, then merges `snap.data()`
     * with the `id` field before returning.
     *
     * @param {InterfaceFirestoreDocument} options - Document address options.
     * @returns {Promise<DocumentData>} A Promise resolving to the document data object with `id` included.
     * @throws {Error} If the document does not exist, with the path in the error message.
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