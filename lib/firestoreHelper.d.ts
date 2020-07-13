import { config } from "firebase-functions";
import { RedisClient } from "redis";
import { Cache } from "./cache";
import Config = config.Config;
export declare class FirestoreHelper {
    cache: Cache;
    client: RedisClient;
    constructor(firebaseConfig: Config, client: RedisClient);
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
        cacheClear?: boolean;
        collection: string;
        document: string;
    }) => Promise<any>;
    /**
     * Get services list
     * @param {any} options
     * @return {Promise<any>[]}
     */
    getList: (options: {
        cache?: boolean;
        cacheClear?: boolean;
        collection: string;
        limit?: number;
        orderBy?: {
            direction: FirebaseFirestore.OrderByDirection;
            key: string;
        };
        where?: {
            field: string | FirebaseFirestore.FieldPath;
            filter: FirebaseFirestore.WhereFilterOp;
            value: any;
        }[];
    }) => Promise<any[]>;
    /**
     * Get services list
     * @param {any} options
     * @return {Promise<string>[]}
     */
    getListIds: (options: {
        collection: string;
        limit?: number;
        orderBy?: {
            direction: FirebaseFirestore.OrderByDirection;
            key: string;
        };
        where?: {
            field: string | FirebaseFirestore.FieldPath;
            filter: FirebaseFirestore.WhereFilterOp;
            value: any;
        }[];
    }) => Promise<string[]>;
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
