// noinspection JSUnusedGlobalSymbols

/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import type {DocumentData, DocumentReference, DocumentSnapshot, FieldPath, OrderByDirection, Query, WhereFilterOp} from 'firebase-admin/firestore';
import {getFirestore} from 'firebase-admin/firestore';


export namespace FirestoreHelper {
  /**
   * Defines a single `orderBy` clause applied to a Firestore query.
   */
  export interface InterfaceFirestoreQueryOrderBy {
    /** Direction of the ordering: `'asc'` or `'desc'`. */
    direction: OrderByDirection;
    /** Name of the Firestore document field to sort by. */
    key: string;
  }

  /**
   * Defines a single `where` filter clause applied to a Firestore query.
   */
  export interface InterfaceFirestoreQueryWhere {
    /** Name or `FieldPath` of the Firestore field to filter on. */
    field: string | FieldPath;
    /** Firestore filter operator (e.g., `'=='`, `'<'`, `'array-contains'`). */
    operator: WhereFilterOp;
    /** Value to compare the field against using the specified operator. */
    value: any;
  }

  /**
   * Options describing a Firestore collection query with optional filtering,
   * ordering, and result-count limiting.
   */
  export interface InterfaceFirestoreQuery {
    /** Name of the Firestore collection to query. Mutually exclusive with `collectionGroup`. */
    collection?: string;
    /** Name of a Firestore collection group to query across all sub-collections. */
    collectionGroup?: string;
    /** Maximum number of documents to return. */
    limit?: number;
    /** Array of `orderBy` clauses to apply in sequence. */
    orderBy?: InterfaceFirestoreQueryOrderBy[];
    /** Array of `where` filter clauses to apply in sequence. */
    where?: InterfaceFirestoreQueryWhere[];
  }

  /**
   * Options for addressing a single Firestore document, either via a
   * `DocumentReference` or by specifying `collection` and `document` names.
   */
  export interface InterfaceFirestoreDocument {
    /** Name of the Firestore collection containing the document. */
    collection?: string;
    /** Firestore document ID within the collection. */
    document?: string;
    /** Direct `DocumentReference` instance; takes precedence over `collection`/`document`. */
    reference?: DocumentReference;
  }

  /**
   * Use FirestoreHelper to get firestore documents
   */
  export class Helper {
    /**
     * Checks whether a Firestore document exists without fetching its data.
     *
     * @param {InterfaceFirestoreDocument} options - Document address options (`collection`/`document` pair or
     *   a `DocumentReference`).
     * @returns {Promise<boolean>} A Promise resolving to `true` if the document exists, `false`
     *   otherwise.
     */
    public static exists = async (options: InterfaceFirestoreDocument): Promise<boolean> => {
      const snap = await this._getDocument(options);
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
    public static getDocument = async (options: InterfaceFirestoreDocument): Promise<DocumentData> => this._getDocumentSnap(options);

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
    public static getList = async (options: InterfaceFirestoreQuery): Promise<DocumentData[]> => {
      const references = await this.getListRef(options);
      let data: DocumentData[] = [];
      for (const ref of references) {
        const docData = await this._getDocumentSnap({reference: ref});
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
    public static getListReference = (options: InterfaceFirestoreQuery): Query => {
      if (!(options.collection || options.collectionGroup)) {
        throw new Error('collection or collectionGroup is required');
      }
      const db = getFirestore();
      let ref: Query;
      if (options.collection) ref = db.collection(options.collection);
      if (options.collectionGroup) ref = db.collectionGroup(options.collectionGroup);
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
    public static getListIds = async (options: InterfaceFirestoreQuery): Promise<string[]> => {
      const ref = this.getListReference(options);
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
    public static getListRef = async (options: InterfaceFirestoreQuery): Promise<DocumentReference[]> => {
      const ref = this.getListReference(options);
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
    public static count = async (options: InterfaceFirestoreQuery): Promise<number> => {
      const ref = this.getListReference(options);
      const snapshot = await ref.count().get();
      if (!snapshot) return 0;
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
    private static _getDocument = (options: InterfaceFirestoreDocument): Promise<DocumentSnapshot> => {
      // Get from Reference
      if (options.reference) return options.reference.get();
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
    private static _getDocumentSnap = async (options: InterfaceFirestoreDocument): Promise<DocumentData> => {
      const snap = await this._getDocument(options);
      if (!snap.exists) {
        if (options.reference) throw new Error(`Not found ${options.reference.path}`);
        throw new Error(`Not found ${options.collection}/${options.document}`);
      }
      return {
        ...snap.data(),
        id: snap.id,
      } as DocumentData;
    };
  }
}
