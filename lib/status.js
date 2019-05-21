"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
const admin = require("firebase-admin");
const db = admin.firestore();
const timestamp = admin.firestore.FieldValue.serverTimestamp();
/**
 * Update Status Collection with Errors
 * @param data
 */
exports.update = async (data) => {
    if (!data.id || !data.status) {
        console.log("Missing input data");
        return;
    }
    const ref = db.collection("status").doc(data.id);
    const status = {
        backup: false,
        description: data.description || null,
        events: admin.firestore.FieldValue.increment(1),
        name: data.name || null,
        status: data.status,
        timestamp,
    };
    await ref.set(status, { merge: true });
};
//# sourceMappingURL=status.js.map