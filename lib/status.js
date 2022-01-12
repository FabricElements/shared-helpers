"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.update = void 0;
const tslib_1 = require("tslib");
/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
const admin = tslib_1.__importStar(require("firebase-admin"));
/**
 * Update Status Collection with Errors
 * @param {any} data
 */
exports.update = async (data) => {
    if (!data.id || !data.status) {
        console.log('Missing input data');
        return;
    }
    const db = admin.firestore();
    const timestamp = admin.firestore.FieldValue.serverTimestamp();
    const ref = db.collection('status').doc(data.id);
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