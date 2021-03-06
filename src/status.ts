/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import * as admin from "firebase-admin";

/**
 * Update Status Collection with Errors
 * @param data
 */
export const update = async (data: any) => {
  if (!data.id || !data.status) {
    console.log("Missing input data");
    return;
  }
  const db = admin.firestore();
  const timestamp = admin.firestore.FieldValue.serverTimestamp();
  const ref = db.collection("status").doc(data.id);
  const status = {
    backup: false,
    description: data.description || null,
    events: admin.firestore.FieldValue.increment(1),
    name: data.name || null,
    status: data.status,
    timestamp,
  };
  await ref.set(status, {merge: true});
};
