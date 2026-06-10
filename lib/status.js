/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
/**
 * Upserts a status document in the `status` Firestore collection.
 *
 * Uses a server-side timestamp and increments the `events` counter on each
 * call.  The document is merged so existing fields not present in `data` are
 * preserved.  Requires both `data.id` and `data.status` to be defined.
 *
 * @param {Data} data - Status payload containing at minimum `id` and `status` fields.
 * @returns {Promise<void>} A Promise that resolves when the Firestore write has completed.
 * @throws {Error} When `data.id` or `data.status` is missing.
 * @deprecated Not in use
 */
export const update = async (data) => {
    if (!data.id || !data.status) {
        throw new Error('Missing input data');
    }
    const db = getFirestore();
    const timestamp = FieldValue.serverTimestamp();
    const ref = db.collection('status').doc(data.id);
    const status = {
        backup: false,
        description: data.description || null,
        events: FieldValue.increment(1),
        name: data.name || null,
        status: data.status,
        timestamp,
    };
    await ref.set(status, { merge: true });
};
//# sourceMappingURL=status.js.map