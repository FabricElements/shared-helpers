/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import type { DocumentData, FieldPath, OrderByDirection, WhereFilterOp } from 'firebase-admin/firestore';
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
     * @return {Promise<DocumentData>}
     */
    getDocument: (options: {
        cache?: boolean;
        cacheLimit?: number;
        collection: string;
        document: string;
    }) => Promise<DocumentData>;
    /**
     * Get list
     * @param {any} options
     * @return {Promise<DocumentData[]>}
     */
    getList: (options: {
        cache?: boolean;
        cacheLimit?: number;
        collection: string;
        limit?: number;
        orderBy?: {
            direction: OrderByDirection;
            key: string;
        }[];
        where?: {
            field: string | FieldPath;
            filter: WhereFilterOp;
            value: any;
        }[];
    }) => Promise<DocumentData[]>;
    /**
     * Get list
     * @param {any} options
     * @return {Promise<string>[]}
     */
    getListIds: (options: {
        collection: string;
        limit?: number;
        orderBy?: {
            direction: OrderByDirection;
            key: string;
        }[];
        where?: {
            field: string | FieldPath;
            filter: WhereFilterOp;
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
            direction: OrderByDirection;
            key: string;
        }[];
        where?: {
            field: string | FieldPath;
            filter: WhereFilterOp;
            value: any;
        }[];
    }) => Promise<number>;
    /**
     * Get document instance from firestore
     *
     * @param {any} options
     * @return {Promise<DocumentSnapshot<DocumentData>>}
     * @private
     */
    private _getDocument;
    /**
     * Get document snapshot from firestore
     *
     * @param {any} options
     * @return {Promise<DocumentData>}
     * @private
     */
    private _getDocumentSnap;
}
