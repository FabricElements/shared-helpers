/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import {BigQuery} from '@google-cloud/bigquery';
import {adapt, managedwriter} from '@google-cloud/bigquery-storage';
import {getFirestore} from 'firebase-admin/firestore';
import {logger} from 'firebase-functions/v2';

import _ from 'lodash';
import {timeout} from './global.js';

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
export default async (data: {
  collection: string,
  dataset: string,
  delete?: boolean,
  items: any[],
  table: string,
  update?: boolean,
}) => {
  if (!data.collection) throw new Error('collection is required');
  if (!data.dataset) throw new Error('dataset is required');
  if (!data.items) throw new Error('items is required');
  if (!data.table) throw new Error('table is required');
  const total = data.items.length;
  if (total === 0) {
    logger.info(`Nothing to backup in collection "${data.collection}"`);
    return;
  }
  let backup = 0;
  let storageClient: managedwriter.WriterClient | undefined;
  let writer: managedwriter.JSONWriter | undefined;
  try {
    const bigquery = new BigQuery();

    // Fetch the table schema to build the protobuf descriptor required by JSONWriter.
    const [tableMetadata] = await bigquery.dataset(data.dataset).table(data.table).getMetadata();
    const storageSchema = adapt.convertBigQuerySchemaToStorageTableSchema(tableMetadata.schema);
    const protoDescriptor = adapt.convertStorageSchemaToProto2Descriptor(storageSchema, 'root');

    // Build the fully-qualified destination path required by the Storage Write API.
    // The project is taken from the table metadata (provided by the Cloud Run
    // runtime); dataset and table are caller-supplied. No project id is specified.
    const projectId = tableMetadata.tableReference.projectId;
    const destinationTable = `projects/${projectId}/datasets/${data.dataset}/tables/${data.table}`;

    storageClient = new managedwriter.WriterClient();
    const connection = await storageClient.createStreamConnection({
      streamId: managedwriter.DefaultStream,
      destinationTable,
    });

    // Use DEFAULT_VALUE for missing fields: rows with extra unknown fields that are
    // not in the schema will be rejected by the server (unlike the legacy
    // ignoreUnknownValues option). Well-formed rows are committed immediately on
    // the default stream (at-least-once, fire-and-forget semantics).
    writer = new managedwriter.JSONWriter({connection, protoDescriptor});
    writer.setDefaultMissingValueInterpretation('DEFAULT_VALUE');
    const pendingWrite = writer.appendRows(data.items);
    await pendingWrite.getResult();
  } catch (error: any) {
    let errorMessage = error.message ?? null;
    if (error.response && error.insertErrors) {
      const finalError = _.flatten(error.response.insertErrors);
      errorMessage = JSON.stringify(finalError);
    }
    if (errorMessage) {
      logger.error(`Error backup for collection "${data.collection}" to BigQuery: ${errorMessage}`);
    } else {
      logger.error(`Error backup for collection "${data.collection}" to BigQuery: ${JSON.stringify(error)}`);
    }
    throw error.toString();
  } finally {
    writer?.close();
    storageClient?.close();
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
    if (!item.id) continue;
    const docRef = db.collection(data.collection).doc(item.id);
    // If delete is true, commit the operation
    if (data.delete) {
      batch.delete(docRef);
    } else {
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
