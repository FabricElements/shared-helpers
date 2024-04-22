/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */

import {FieldValue, getFirestore} from 'firebase-admin/firestore';

interface Data {
  id?: string;
  status?: string;
  description?: string;
  name?: string;

  [x: string]: any,
}

/**
 * Update Status Collection with Errors
 * @param {Data} data
 * @deprecated Not in use
 */
export const update = async (data: Data): Promise<void> => {
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
  await ref.set(status, {merge: true});
};
