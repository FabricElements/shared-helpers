/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import {BigQuery} from "@google-cloud/bigquery";
import * as admin from "firebase-admin";
import {timeout} from "./global";

const bigquery = new BigQuery();

/**
 * Conformed backup function for link-app
 *
 * @param collection
 * @param dataset
 * @param del - if true, deletes document instead of changing backup to true on document
 * @param items
 * @param table
 * @param updateKey
 */
export default async (
  collection: string,
  dataset: string,
  del: boolean,
  items: any,
  table: string,
  updateKey: string | null = "id") => {
  const total = items.length;
  // Backup service data to BigQuery
  await bigquery
    .dataset(dataset)
    .table(table)
    .insert(items, {
      // @ts-ignore
      ignoreUnknownValues: true,
      skipInvalidRows: true,
    });
  // Update firestore documents
  const db = admin.firestore();
  let batch = db.batch();
  for (let i = 0; i < total; i++) {
    const item = items[i];
    if (!item.id) {
      continue;
    }
    const docRef: any = db.collection(collection).doc(item[updateKey]);
    // If delete is true, commit the operation
    if (del) {
      batch.delete(docRef);
    } else {
      batch.update(docRef, {
        backup: true,
      });
    }
    if (i === (items.length - 1) || i > 0 && i % 400 === 0) {
      console.info("Backup..", i + 1);
      await batch.commit();
      batch = db.batch();
      await timeout(1000); // Waiting 1 second for next request...
    }
  }
};
