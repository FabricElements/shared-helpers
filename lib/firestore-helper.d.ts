/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import type { DocumentData, FieldPath, OrderByDirection, Query, WhereFilterOp } from 'firebase-admin/firestore';
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
    where?: InterfaceFirestoreQueryWhere[];
}
export interface InterfaceFirestoreDocument {
    collection: string;
    document: string;
}
/**
 * Use FirestoreHelper to get firestore documents
 */
export declare class FirestoreHelper {
    /**
     * Validate if document exists
     *
     * @param {InterfaceFirestoreDocument} options
     */
    static exists: (options: InterfaceFirestoreDocument) => Promise<boolean>;
    /**
     * Get Document
     * @param {InterfaceFirestoreDocument} options
     * @return {Promise<DocumentData>}
     */
    static getDocument: (options: InterfaceFirestoreDocument) => Promise<DocumentData>;
    /**
     * Get list
     * @param {InterfaceFirestoreQuery} options
     * @return {Promise<DocumentData[]>}
     */
    static getList: (options: InterfaceFirestoreQuery) => Promise<DocumentData[]>;
    /**
     * Get List reference for later use
     * @param {InterfaceFirestoreQuery} options
     * @return {Query}
     */
    static getListReference: (options: InterfaceFirestoreQuery) => Query<DocumentData>;
    /**
     * Get list
     * @param {InterfaceFirestoreQuery} options
     * @return {Promise<string>[]}
     */
    static getListIds: (options: InterfaceFirestoreQuery) => Promise<string[]>;
    /**
     * Count documents on a query
     * @param {InterfaceFirestoreQuery} options
     * @return {Promise<string>[]}
     */
    static count: (options: InterfaceFirestoreQuery) => Promise<number>;
    /**
     * Get document instance from firestore
     *
     * @param {InterfaceFirestoreDocument} options
     * @return {Promise<Promise<DocumentSnapshot>>}
     * @private
     */
    private static _getDocument;
    /**
     * Get document snapshot from firestore
     *
     * @param {InterfaceFirestoreDocument} options
     * @return {Promise<DocumentData>}
     * @private
     */
    private static _getDocumentSnap;
}
