/**
 * Validate if document exists
 *
 * @param options
 * @returns <Promise<boolean>>
 */
export declare const existDocument: (options: {
    collection: string;
    document: string;
}) => Promise<boolean>;
/**
 * Get Document
 * @param options
 * @return {Promise<any>}
 */
export declare const getDocument: (options: {
    cache?: boolean;
    cacheClear?: boolean;
    collection: string;
    document: string;
}) => Promise<any>;
/**
 * Get services list
 * @param {any} options
 * @return {Promise<string>[]}
 */
export declare const getListIds: (options: {
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
 * Get services list
 * @param {any} options
 * @return {Promise<any>[]}
 */
export declare const getList: (options: {
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
