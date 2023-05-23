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
        });
    }
    catch (error) {
        let errorMessage = error['message'] ?? null;
        if (Object.prototype.hasOwnProperty.call(error, 'response') && Object.prototype.hasOwnProperty.call(error, 'insertErrors')) {
            // @ts-ignore
            const finalError = _.flatten(error.response.insertErrors);
            errorMessage = JSON.stringify(finalError);
        }
        if (errorMessage)
            logger.error(errorMessage);
        throw error;
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
            // console.info("Backup..", i + 1);
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
    console.info(`${backup} items backup for collection "${data.collection}"`);
};
//# sourceMappingURL=backup.js.map