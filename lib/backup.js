"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
const bigquery_1 = require("@google-cloud/bigquery");
const admin = (0, tslib_1.__importStar)(require("firebase-admin"));
const lodash_1 = (0, tslib_1.__importDefault)(require("lodash"));
const global_js_1 = require("./global.js");
const bigquery = new bigquery_1.BigQuery();
/**
 * Custom backup from FirestoreHelper to BigQuery
 *
 * @param data
 * if true, deletes document instead of changing backup to true on document
 * 1500/minute --- Recommended memory 500mb
 */
exports.default = async (data) => {
    const total = data.items.length;
    if (total === 0) {
        // console.info(`Nothing to backup in collection "${data.collection}"`);
        return null;
    }
    let backup = 0;
    try {
        await bigquery
            .dataset(data.dataset)
            .table(data.table)
            .insert(data.items, {
            // @ts-ignore
            ignoreUnknownValues: true,
            skipInvalidRows: true,
        });
    }
    catch (error) {
        let errorMessage = error.message || null;
        if (error.hasOwnProperty("response") && error.response.hasOwnProperty("insertErrors")) {
            const finalError = lodash_1.default.flatten(error.response.insertErrors);
            errorMessage = JSON.stringify(finalError);
        }
        throw new Error(errorMessage);
    }
    // Update firestore documents
    const db = admin.firestore();
    let batch = db.batch();
    let pending = 0;
    for (let i = 0; i < total; i++) {
        const item = data.items[i];
        if (!item.id) {
            continue;
        }
        const updateKey = data.updateKey || "id";
        const docRef = db.collection(data.collection).doc(item[updateKey]);
        // If delete is true, commit the operation
        if (data.del) {
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
            await (0, global_js_1.timeout)(100); // Waiting for next request...
        }
    }
    if (pending > 0) {
        backup += pending;
        await batch.commit();
    }
    console.info(`${backup} items backup for collection "${data.collection}"`);
    return null;
};
//# sourceMappingURL=backup.js.map