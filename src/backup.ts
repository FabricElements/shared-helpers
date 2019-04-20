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
 * @param data
 * if true, deletes document instead of changing backup to true on document
 */
export default async (data: {
  collection: string,
  dataset: string,
  del?: boolean,
  items: any,
  table: string,
  updateKey?: string | null,
}) => {
  const total = data.items.length;
  if (total === 0) {
    console.info("Nothing to backup");
    return null;
  }
  try {
    await bigquery
      .dataset(data.dataset)
      .table(data.table)
      .insert(data.items, {
        // @ts-ignore
        ignoreUnknownValues: true,
        skipInvalidRows: true,
      });
  } catch (error) {
    let errorMessage = error.message || null;
    if (error.hasOwnProperty("response") && error.response.hasOwnProperty("insertErrors")) {
      errorMessage = [error.response.insertErrors];
    }
    throw new Error(errorMessage);
  }
  // Update firestore documents
  const db = admin.firestore();
  let batch = db.batch();
  for (let i = 0; i < total; i++) {
    const item = data.items[i];
    if (!item.id) {
      continue;
    }
    const updateKey = data.updateKey || "id";
    const docRef: any = db.collection(data.collection).doc(item[updateKey]);
    // If delete is true, commit the operation
    if (data.del) {
      batch.delete(docRef);
    } else {
      batch.update(docRef, {
        backup: true,
      });
    }
    if (i === (data.items.length - 1) || i > 0 && i % 400 === 0) {
      console.info("Backup..", i + 1);
      await batch.commit();
      batch = db.batch();
      await timeout(1000); // Waiting 1 second for next request...
    }
  }
  return null;
};
