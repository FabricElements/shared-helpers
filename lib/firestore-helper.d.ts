/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import type { DocumentData, DocumentReference, FieldPath, OrderByDirection, Query, WhereFilterOp } from 'firebase-admin/firestore';
export declare namespace FirestoreHelper {
    interface InterfaceFirestoreQueryOrderBy {
        direction: OrderByDirection;
        key: string;
    }
    interface InterfaceFirestoreQueryWhere {
        field: string | FieldPath;
        operator: WhereFilterOp;
        value: any;
    }
    interface InterfaceFirestoreQuery {
        collection?: string;
        collectionGroup?: string;
        limit?: number;
        orderBy?: InterfaceFirestoreQueryOrderBy[];
        where?: InterfaceFirestoreQueryWhere[];
    }
    interface InterfaceFirestoreDocument {
        collection?: string;
        document?: string;
        reference?: DocumentReference;
    }
    /**
     * Use FirestoreHelper to get firestore documents
     */
    class Helper {
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
        static getListReference: (options: InterfaceFirestoreQuery) => Query;
        /**
         * Get list
         * @param {InterfaceFirestoreQuery} options
         * @return {Promise<string>[]}
         */
        static getListIds: (options: InterfaceFirestoreQuery) => Promise<string[]>;
        /**
         * Get list
         * @param {InterfaceFirestoreQuery} options
         * @return {Promise<DocumentReference[]>}
         */
        static getListRef: (options: InterfaceFirestoreQuery) => Promise<DocumentReference[]>;
        /**
         * Count documents on a query
         * @param {InterfaceFirestoreQuery} options
         * @return {Promise<number>}
         */
        static count: (options: InterfaceFirestoreQuery) => Promise<number>;
        /**
         * Get document instance from firestore
         *
         * @param {InterfaceFirestoreDocument} options
         * @return {Promise<FirebaseFirestore.DocumentSnapshot>}
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
}
