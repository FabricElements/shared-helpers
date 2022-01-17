"use strict";
/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.update = void 0;
const firestore_1 = require("firebase-admin/firestore");
/**
 * Update Status Collection with Errors
 * @param {any} data
 */
const update = async (data) => {
    if (!data.id || !data.status) {
        console.log('Missing input data');
        return;
    }
    const db = (0, firestore_1.getFirestore)();
    const timestamp = firestore_1.FieldValue.serverTimestamp();
    const ref = db.collection('status').doc(data.id);
    const status = {
        backup: false,
        description: data.description || null,
        events: firestore_1.FieldValue.increment(1),
        name: data.name || null,
        status: data.status,
        timestamp,
    };
    await ref.set(status, { merge: true });
};
exports.update = update;
//# sourceMappingURL=status.js.map