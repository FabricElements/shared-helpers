/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
/**
 * Update Status Collection with Errors
 * @param {Data} data
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