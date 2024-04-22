// noinspection JSUnusedGlobalSymbols

/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import type {DocumentData, DocumentReference, DocumentSnapshot, FieldPath, OrderByDirection, Query, WhereFilterOp} from 'firebase-admin/firestore';
import {getFirestore} from 'firebase-admin/firestore';


export namespace FirestoreHelper {
  export interface InterfaceFirestoreQueryOrderBy {
    direction: OrderByDirection;
    key: string;
  }

  export interface InterfaceFirestoreQueryWhere {
    field: string | FieldPath;
    operator: WhereFilterOp;
    value: any;
  }

  export interface InterfaceFirestoreQuery {
    collection?: string;
    collectionGroup?: string;
    limit?: number;
    orderBy?: InterfaceFirestoreQueryOrderBy[];
    where?: InterfaceFirestoreQueryWhere[];
  }

  export interface InterfaceFirestoreDocument {
    collection?: string;
    document?: string;
    reference?: DocumentReference;
  }

  /**
   * Use FirestoreHelper to get firestore documents
   */
  export class Helper {
    /**
     * Validate if document exists
     *
     * @param {InterfaceFirestoreDocument} options
     */
    public static exists = async (options: InterfaceFirestoreDocument): Promise<boolean> => {
      const snap = await this._getDocument(options);
      return snap.exists;
    };

    /**
     * Get Document
     * @param {InterfaceFirestoreDocument} options
     * @return {Promise<DocumentData>}
     */
    public static getDocument = async (options: InterfaceFirestoreDocument): Promise<DocumentData> => this._getDocumentSnap(options);

    /**
     * Get list
     * @param {InterfaceFirestoreQuery} options
     * @return {Promise<DocumentData[]>}
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
     * Get List reference for later use
     * @param {InterfaceFirestoreQuery} options
     * @return {Query}
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
     * Get list
     * @param {InterfaceFirestoreQuery} options
     * @return {Promise<string>[]}
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
     * Get list
     * @param {InterfaceFirestoreQuery} options
     * @return {Promise<DocumentReference[]>}
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
     * Count documents on a query
     * @param {InterfaceFirestoreQuery} options
     * @return {Promise<number>}
     */
    public static count = async (options: InterfaceFirestoreQuery): Promise<number> => {
      const ref = this.getListReference(options);
      const snapshot = await ref.count().get();
      if (!snapshot) return 0;
      return snapshot.data().count;
    };

    /**
     * Get document instance from firestore
     *
     * @param {InterfaceFirestoreDocument} options
     * @return {Promise<FirebaseFirestore.DocumentSnapshot>}
     * @private
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
     * Get document snapshot from firestore
     *
     * @param {InterfaceFirestoreDocument} options
     * @return {Promise<DocumentData>}
     * @private
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
