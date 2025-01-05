/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import { BigQuery } from '@google-cloud/bigquery';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import _ from 'lodash';
import { timeout } from './global.js';
/**
 * Custom backup from FirestoreHelper to BigQuery
 *
 * @param {any} data
 * if true, deletes document instead of changing backup to true on document
 * 1500/minute --- Recommended memory 500mb
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
    try {
        const bigquery = new BigQuery();
        await bigquery.dataset(data.dataset).table(data.table).insert(data.items, {
            ignoreUnknownValues: true,
            skipInvalidRows: true,
        }).catch((error) => {
            if (error && error.name === 'PartialFailureError') {
                const insertErrors = error.errors;
                insertErrors.forEach((err) => {
                    logger.error(`Error inserting row: ${JSON.stringify(err)}`);
                });
            }
            else {
                throw error;
            }
        });
    }
    catch (error) {
        let errorMessage = error['message'] ?? null;
        if (Object.prototype.hasOwnProperty.call(error, 'response') && Object.prototype.hasOwnProperty.call(error, 'insertErrors')) {
            const finalError = _.flatten(error.response.insertErrors);
            errorMessage = JSON.stringify(finalError);
        }
        if (errorMessage)
            logger.error(`BigQuery Backup: Error inserting rows: ${errorMessage}`);
        return;
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