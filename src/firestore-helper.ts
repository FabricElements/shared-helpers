/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import type {DocumentData, FieldPath, OrderByDirection, Query, WhereFilterOp} from 'firebase-admin/firestore';
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
  collection: string;
  limit?: number;
  orderBy?: InterfaceFirestoreQueryOrderBy[];
  where?: InterfaceFirestoreQueryWhere[]
}

export interface InterfaceFirestoreDocument {
  collection: string;
  document: string
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
    const snap = await this._getDocument({
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
  public static getDocument = async (options: InterfaceFirestoreDocument) => await this._getDocumentSnap({
    collection: options.collection,
    document: options.document,
  });

  /**
   * Get list
   * @param {InterfaceFirestoreQuery} options
   * @return {Promise<DocumentData[]>}
   */
  public static getList = async (options: InterfaceFirestoreQuery) => {
    const ids = await this.getListIds({
      collection: options.collection,
      limit: options.limit,
      orderBy: options.orderBy,
      where: options.where,
    });
    const data: DocumentData[] = [];
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      const docData = await this.getDocument({
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
  public static getListReference = (options: InterfaceFirestoreQuery) => {
    if (!options.collection) {
      throw new Error('collection is undefined');
    }
    const db = getFirestore();
    let ref: Query = db.collection(options.collection);
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
   * @return {Promise<Promise<DocumentSnapshot>>}
   * @private
   */
  private static _getDocument = (options: InterfaceFirestoreDocument) => {
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
}
