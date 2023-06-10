/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import type {
  DocumentData,
  DocumentReference,
  FieldPath,
  OrderByDirection,
  Query,
  WhereFilterOp,
} from 'firebase-admin/firestore';
import {getFirestore} from 'firebase-admin/firestore';

export interface InterfaceFirestoreQueryOrderBy {
  direction: OrderByDirection;
  key: string;
}

export interface InterfaceFirestoreQueryWhere {
  field: string | FieldPath;
  filter: WhereFilterOp;
  value: any;
}

export interface InterfaceFirestoreQuery {
  collection?: string;
  collectionGroup?: string;
  limit?: number;
  orderBy?: InterfaceFirestoreQueryOrderBy[];
  where?: InterfaceFirestoreQueryWhere[]
}

export interface InterfaceFirestoreDocument {
  collection?: string;
  document?: string;
  reference?: DocumentReference;
}

/**
 * Use FirestoreHelper to get firestore documents
 */
export class FirestoreHelper {
  /**
   * Validate if document exists
   *
   * @param {InterfaceFirestoreDocument} options
   */
  public static exists = async (options: InterfaceFirestoreDocument) => {
    const snap = await this._getDocument(options);
    return snap.exists;
  };

  /**
   * Get Document
   * @param {InterfaceFirestoreDocument} options
   * @return {Promise<DocumentData>}
   */
  public static getDocument = async (options: InterfaceFirestoreDocument) => await this._getDocumentSnap(options);

  /**
   * Get list
   * @param {InterfaceFirestoreQuery} options
   * @return {Promise<DocumentData[]>}
   */
  public static getList = async (options: InterfaceFirestoreQuery) => {
    const references = await this.getListRef(options);
    const data: DocumentData[] = [];
    for (let i = 0; i < references.length; i++) {
      const ref = references[i];
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
  public static getListReference = (options: InterfaceFirestoreQuery) => {
    if (!(options.collection || options.collectionGroup)) {
      throw new Error('collection or collectionGroup is required');
    }
    const db = getFirestore();
    let ref: Query;
    if (options.collection) ref = db.collection(options.collection);
    if (options.collectionGroup) ref = db.collectionGroup(options.collectionGroup);
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
  public static getListIds = async (options: InterfaceFirestoreQuery) => {
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
   * @return {Promise<DocumentReference>[]}
   */
  public static getListRef = async (options: InterfaceFirestoreQuery) => {
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
   * @return {Promise<string>[]}
   */
  public static count = async (options: InterfaceFirestoreQuery) => {
    const ref = this.getListReference(options);
    const snapshot = await ref.count().get();
    if (!snapshot) return 0;
    return snapshot.data().count;
  };

  /**
   * Get document instance from firestore
   *
   * @param {InterfaceFirestoreDocument} options
   * @return {Promise<Promise<FirebaseFirestore.DocumentSnapshot>>}
   * @private
   */
  private static _getDocument = (options: InterfaceFirestoreDocument) => {
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
  private static _getDocumentSnap = async (options: InterfaceFirestoreDocument) => {
    const snap = await this._getDocument(options);
    if (!snap.exists) {
      if (options.reference) throw new Error(`Not found ${options.reference.path}`);
      throw new Error(`Not found ${options.collection}/${options.document}`);
    }
    const data = snap.data();
    data.id = options.document;
    return data;
  };
}
