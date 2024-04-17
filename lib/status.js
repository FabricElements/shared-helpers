/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
/**
 * Update Status Collection with Errors
 * @param {any} data
 */
export const update = async (data) => {
    if (!data.id || !data.status) {
        console.log('Missing input data');
        return;
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
    // noinspection Annotator
    await ref.set(status, { merge: true });
};
//# sourceMappingURL=status.js.map