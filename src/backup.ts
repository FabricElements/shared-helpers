/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import {BigQuery} from '@google-cloud/bigquery';
import {getFirestore} from 'firebase-admin/firestore';
import {logger} from 'firebase-functions/v2';

import _ from 'lodash';
import {timeout} from './global.js';

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
 * @param data - Backup job descriptor containing the source collection name,
 *   target BigQuery dataset and table identifiers, the array of document
 *   payloads to insert, and optional flags controlling post-insert Firestore
 *   mutations.
 * @param data.collection - Name of the Firestore source collection; used for
 *   log messages and to locate documents when `update` is `true`.
 * @param data.dataset - BigQuery dataset identifier.
 * @param data.delete - When `true`, deletes Firestore documents after backup
 *   instead of setting `backup: true`.  Requires `update: true`.
 * @param data.items - Array of document payloads to insert into BigQuery.
 *   Each item should have an `id` field for the Firestore update pass.
 * @param data.table - BigQuery table identifier within `dataset`.
 * @param data.update - When `true`, triggers the Firestore post-insert pass
 *   that marks or deletes each source document.
 * @returns A Promise that resolves when the BigQuery insert and any Firestore
 *   updates have completed.
 * @throws A stringified error if the BigQuery insert job fails.
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
  try {
    const bigquery = new BigQuery();
    await bigquery.dataset(data.dataset).table(data.table).insert(data.items, {
      ignoreUnknownValues: true,
      skipInvalidRows: true,
    });
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
