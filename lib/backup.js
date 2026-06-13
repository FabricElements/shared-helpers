/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import { BigQueryStreamWriter } from './bigquery-stream-writer.js';
import { timeout } from './global.js';
/**
 * Streams Firestore documents into a BigQuery table using the
 * {@link BigQueryStreamWriter} (BigQuery Storage Write API) and optionally
 * updates or deletes the originating Firestore documents afterwards.
 *
 * Rows are written via the Storage Write API default stream (at-least-once,
 * committed-on-append semantics), which is the modern high-throughput replacement
 * for the legacy `tabledata.insertAll` streaming insert.  Missing fields receive
 * their column default value (`DEFAULT_VALUE` interpretation); rows whose fields
 * do not conform to the table schema may be rejected by the server.  Well-formed
 * rows are committed immediately.
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
export default async (data) => {
    if (!data.collection)
        throw new Error('collection is required');
    if (!data.dataset)
        throw new Error('dataset is required');
    if (!data.items)
        throw new Error('items is required');
    if (!data.table)
        throw new Error('table is required');
    const total = data.items.length;
    if (total === 0) {
        logger.info(`Nothing to backup in collection "${data.collection}"`);
        return;
    }
    let backup = 0;
    const writer = new BigQueryStreamWriter({ dataset: data.dataset, table: data.table });
    try {
        // Buffer every item and flush as a single committed batch on close. The
        // writer owns all Storage Write API resources and error inspection.
        await writer.addRows(data.items);
        await writer.close();
    }
    catch (error) {
        const errorMessage = error?.message ?? JSON.stringify(error);
        logger.error(`Error backup for collection "${data.collection}" to BigQuery: ${errorMessage}`);
        // Release any half-initialised connection before propagating the failure.
        await writer.close().catch(() => undefined);
        throw error.toString();
    }
    if (!data.update) {
        logger.info(`${total} items backup for collection "${data.collection}" to BigQuery but not update Firestore. To update Firestore pass the parameter "update" as true`);
        return;
    }
    // Update firestore documents
    const db = getFirestore();
    let batch = db.batch();
    let pending = 0;
    for (let i = 0; i < total; i++) {
        const item = data.items[i];
        if (!item.id)
            continue;
        const docRef = db.collection(data.collection).doc(item.id);
        // If delete is true, commit the operation
        if (data.delete) {
            batch.delete(docRef);
        }
        else {
            batch.update(docRef, {
                backup: true,
            });
        }
        pending++;
        if (pending === 500) {
            // logger.info("Backup..", i + 1);
            await batch.commit();
            backup += pending;
            batch = db.batch();
            pending = 0;
            await timeout(100); // Waiting for next request...
        }
    }
    if (pending > 0) {
        backup += pending;
        await batch.commit();
    }
    logger.info(`${backup} items backup for collection "${data.collection}" to Firestore`);
};
//# sourceMappingURL=backup.js.map