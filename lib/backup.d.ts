declare const _default: (data: {
    collection: string;
    dataset: string;
    del?: boolean;
    items: any;
    table: string;
    updateKey?: string | null;
}) => Promise<any>;
/**
 * Custom backup from Firestore to BigQuery
 *
 * @param data
 * if true, deletes document instead of changing backup to true on document
 */
export default _default;
