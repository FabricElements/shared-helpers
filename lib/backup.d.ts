/**
 * Streams Firestore documents into a BigQuery table and optionally updates
 * or deletes the originating Firestore documents afterwards.
 *
 * The function inserts all items into BigQuery using `ignoreUnknownValues`
 * and `skipInvalidRows` to tolerate schema mismatches.  When `update` is
 * `true` it subsequently iterates the item list in Firestore batch commits
 * (max 500 per batch) and either marks each document with `backup: true` or
 * deletes it when `delete` is `true`.  A 100 ms pause is injected between
 * batches to stay within Firestore write limits (~1 500 writes/minute).
 *
 * @param {object} data - Backup job descriptor.
 * @param {string} data.collection - Name of the Firestore source collection; used for
 *   log messages and to locate documents when `update` is `true`.
 * @param {string} data.dataset - BigQuery dataset identifier.
 * @param {boolean} [data.delete] - When `true`, deletes Firestore documents after backup
 *   instead of setting `backup: true`.  Requires `update: true`.
 * @param {any[]} data.items - Array of document payloads to insert into BigQuery.
 *   Each item should have an `id` field for the Firestore update pass.
 * @param {string} data.table - BigQuery table identifier within `dataset`.
 * @param {boolean} [data.update] - When `true`, triggers the Firestore post-insert pass
 *   that marks or deletes each source document.
 * @returns {Promise<void>} A Promise that resolves when the BigQuery insert and any
 *   Firestore updates have completed.
 * @throws {string} A stringified error if the BigQuery insert job fails.
 */
declare const _default: (data: {
    collection: string;
    dataset: string;
    delete?: boolean;
    items: any[];
    table: string;
    update?: boolean;
}) => Promise<void>;
export default _default;
