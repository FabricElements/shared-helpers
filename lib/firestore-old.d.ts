/**
 * Exist Document
 * @param collectionId
 * @param documentId
 */
export declare const existDocument: (collectionId: string, documentId: string) => Promise<boolean>;
/**
 * Get Document
 * @param collectionId
 * @param documentId
 */
export declare const getDocument: (collectionId: string, documentId: string) => Promise<any>;
/**
 * Get services list
 * @param {any} options
 */
export declare const getList: (options: {
    collectionId: string;
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
