/**
 * Custom backup from FirestoreHelper to BigQuery
 *
 * @param {any} data
 * if true, deletes document instead of changing backup to true on document
 * 1500/minute --- Recommended memory 500mb
 */
declare const _default: (data: {
    collection: string;
    dataset: string;
    delete?: boolean;
    items: any[];
    table: string;
}) => Promise<void>;
export default _default;
