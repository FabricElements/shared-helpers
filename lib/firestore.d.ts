import { config } from "firebase-functions";
import { ClientOpts } from "redis";
import { Tedis } from "tedis";
import Config = config.Config;
export declare class FirestoreHelper {
    canCache: boolean;
    prefix: string;
    redisClient: Tedis;
    constructor(firebaseConfig?: Config, clientOpts?: ClientOpts);
    /**
     * Validate if document exists
     *
     * @param options
     * @returns <Promise<boolean>>
     */
    existDocument: (options: {
        collection: string;
        document: string;
    }) => Promise<boolean>;
    /**
     * Get Document
     * @param options
     * @return {Promise<any>}
     */
    getDocument: (options: {
        cache?: boolean;
        cacheLimit?: number;
        collection: string;
        document: string;
    }) => Promise<any>;
    /**
     * Get list
     * @param {any} options
     * @return {Promise<any>[]}
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
    }) => Promise<any[]>;
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
    }) => Promise<string[]>;
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
