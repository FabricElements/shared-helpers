/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */

import {FieldValue, getFirestore} from 'firebase-admin/firestore';

/**
 * Represents a status document payload for the `status` Firestore collection.
 * Fields beyond the declared ones are accepted via the index signature.
 */
interface Data {
  /** Firestore document ID of the status record to upsert. */
  id?: string;
  /** Short machine-readable status code (e.g., `'active'`, `'error'`). */
  status?: string;
  /** Human-readable description providing additional context for the status. */
  description?: string;
  /** Display name associated with the entity being tracked. */
  name?: string;

  [x: string]: any,
}

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
