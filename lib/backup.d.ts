/**
 * Streams Firestore documents into a BigQuery table using the BigQuery Storage
 * Write API and optionally updates or deletes the originating Firestore documents
 * afterwards.
 *
 * Rows are written via the Storage Write API default stream (at-least-once,
 * committed-on-append semantics), which is the modern high-throughput replacement
 * for the legacy `tabledata.insertAll` streaming insert.  Missing fields receive
 * their column default value (`DEFAULT_VALUE` interpretation), which approximates
 * the `ignoreUnknownValues` / `skipInvalidRows` tolerance of the legacy API; rows
 * whose fields do not conform to the table schema may be rejected by the server.
 * Well-formed rows are committed immediately.
 *
 * The destination project is taken from the resolved table metadata, which the
 * Cloud Run runtime provides automatically — callers only supply `data.dataset`
 * and `data.table` and never need to specify a project id.
 *
 * When `update` is `true` the function subsequently iterates the item list in
 * Firestore batch commits (max 500 per batch) and either marks each document with
 * `backup: true` or deletes it when `delete` is `true`.  A 100 ms pause is
 * injected between batches to stay within Firestore write limits
 * (~1 500 writes/minute).
 *
 * @param {object} data - Backup job descriptor.
 * @param {string} data.collection - Name of the Firestore source collection; used for
 *   log messages and to locate documents when `update` is `true`.
 * @param {string} data.dataset - BigQuery dataset identifier.
 * @param {boolean} [data.delete] - When `true`, deletes Firestore documents after backup
 *   instead of setting `backup: true`.  Requires `update: true`.
 * @param {any[]} data.items - Array of document payloads to write into BigQuery.
 *   Each item should have an `id` field for the Firestore update pass.
 * @param {string} data.table - BigQuery table identifier within `dataset`.
 * @param {boolean} [data.update] - When `true`, triggers the Firestore post-write pass
 *   that marks or deletes each source document.
 * @returns {Promise<void>} A Promise that resolves when the BigQuery write and any
 *   Firestore updates have completed.
 * @throws {string} A stringified error if the BigQuery Storage Write API call fails.
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
