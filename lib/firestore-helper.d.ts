import { Tedis } from 'tedis';
/**
 * Use FirestoreHelper to get firestore documents from redis cache
 */
export declare class FirestoreHelper {
    canCache: boolean;
    logs: boolean;
    prefix: string;
    redisClient: Tedis;
    /**
     * Constructor
     * @param {any} config
     */
    constructor(config?: {
        host?: string;
        logs?: boolean;
        port?: number;
        [key: string]: any;
    });
    /**
     * Validate if document exists
     *
     * @param {any} options
     */
    existDocument: (options: {
        collection: string;
        document: string;
    }) => Promise<boolean>;
    /**
     * Get Document
     * @param {any} options
     * @return {Promise<FirebaseFirestore.DocumentData>}
     */
    getDocument: (options: {
        cache?: boolean;
        cacheLimit?: number;
        collection: string;
        document: string;
    }) => Promise<FirebaseFirestore.DocumentData>;
    /**
     * Get list
     * @param {any} options
     * @return {Promise<FirebaseFirestore.DocumentData[]>}
     */
    getList: (options: {
        cache?: boolean;
        cacheLimit?: number;
        collection: string;
        limit?: number;
        orderBy?: {
            direction: FirebaseFirestore.OrderByDirection;
            key: string;
        }[];
        where?: {
            field: string | FirebaseFirestore.FieldPath;
            filter: FirebaseFirestore.WhereFilterOp;
            value: any;
        }[];
    }) => Promise<FirebaseFirestore.DocumentData[]>;
    /**
     * Get list
     * @param {any} options
     * @return {Promise<string>[]}
     */
    getListIds: (options: {
        collection: string;
        limit?: number;
        orderBy?: {
            direction: FirebaseFirestore.OrderByDirection;
            key: string;
        }[];
        where?: {
            field: string | FirebaseFirestore.FieldPath;
            filter: FirebaseFirestore.WhereFilterOp;
            value: any;
        }[];
    }) => Promise<any>;
    /**
     * Get list size
     * @param {any} options
     * @return {Promise<string>[]}
     */
    getListSize: (options: {
        collection: string;
        limit?: number;
        orderBy?: {
            direction: FirebaseFirestore.OrderByDirection;
            key: string;
        }[];
        where?: {
            field: string | FirebaseFirestore.FieldPath;
            filter: FirebaseFirestore.WhereFilterOp;
            value: any;
        }[];
    }) => Promise<any>;
    /**
     * Get document instance from firestore
     *
     * @param {any} options
     * @return {Promise<FirebaseFirestore.DocumentSnapshot<FirebaseFirestore.DocumentData>>}
     * @private
     */
    private _getDocument;
    /**
     * Get document snapshot from firestore
     *
     * @param {any} options
     * @return {Promise<FirebaseFirestore.DocumentData>}
     * @private
     */
    private _getDocumentSnap;
}
