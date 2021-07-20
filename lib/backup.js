var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import { BigQuery } from "@google-cloud/bigquery";
import * as admin from "firebase-admin";
import _ from "lodash";
import { timeout } from "./global.js";
const bigquery = new BigQuery();
/**
 * Custom backup from FirestoreHelper to BigQuery
 *
 * @param data
 * if true, deletes document instead of changing backup to true on document
 * 1500/minute --- Recommended memory 500mb
 */
export default (data) => __awaiter(void 0, void 0, void 0, function* () {
    const total = data.items.length;
    if (total === 0) {
        // console.info(`Nothing to backup in collection "${data.collection}"`);
        return null;
    }
    let backup = 0;
    try {
        yield bigquery
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
            const finalError = _.flatten(error.response.insertErrors);
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
            yield batch.commit();
            backup += pending;
            batch = db.batch();
            pending = 0;
            yield timeout(100); // Waiting for next request...
        }
    }
    if (pending > 0) {
        backup += pending;
        yield batch.commit();
    }
    console.info(`${backup} items backup for collection "${data.collection}"`);
    return null;
});
//# sourceMappingURL=backup.js.map