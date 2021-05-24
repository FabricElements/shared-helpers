import { Tedis } from "tedis";
/**
 * Use FirestoreHelper to get firestore documents from redis cache
 */
export declare class FirestoreHelper {
    canCache: boolean;
    prefix: string;
    redisClient: Tedis;
    /**
     * Constructor
     * @param config
     */
    constructor(config?: {
        [key: string]: any;
    });
    /**
     * Validate if document exists
     *
     * @param options
     */
    existDocument: (options: {
        collection: string;
        document: string;
    }) => Promise<boolean>;
    /**
     * Get Document
     * @param options
     */
    getDocument: (options: {
        cache?: boolean;
        cacheLimit?: number;
        collection: string;
        document: string;
    }) => Promise<FirebaseFirestore.DocumentData>;
    /**
     * Get list
     * @param options
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
     * @param options
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
    }) => Promise<string[]>;
    /**
     * Get list size
     * @param options
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
    }) => Promise<number>;
    /**
     * Get document instance from firestore
     *
     * @param options
     * @private
     */
    private _getDocument;
    /**
     * Get document snapshot from firestore
     *
     * @param options
     * @private
     */
    private _getDocumentSnap;
}
