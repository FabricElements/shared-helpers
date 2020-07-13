/**
 * Validate if document exists
 *
 * @param options
 */
export declare const existDocument: (options: {
    collection: string;
    document: string;
}) => Promise<boolean>;
/**
 * Get Document
 * @param options
 */
export declare const getDocument: (options: {
    cache?: boolean;
    cacheClear?: boolean;
    collection: string;
    document: string;
}) => Promise<{}>;
/**
 * Get services list
 * @param {any} options
 */
export declare const getList: (options: {
    cache?: boolean;
    cacheClear?: boolean;
    collection: string;
    fullResponse?: boolean;
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
}) => Promise<any>;
