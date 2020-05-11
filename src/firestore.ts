/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import * as admin from "firebase-admin";

/**
 * Exist Document
 * @param collectionId
 * @param documentId
 */
export const existDocument = async (collectionId: string, documentId: string) => {
  if (!documentId) {
    throw new Error("Missing id");
  }
  const db = admin.firestore();
  const ref = db.collection(collectionId).doc(documentId);
  const snap = await ref.get();
  return snap.exists;
};

/**
 * Get Document
 * @param collectionId
 * @param documentId
 */
export const getDocument = async (collectionId: string, documentId: string) => {
  if (!documentId) {
    throw new Error("Missing id");
  }
  const db = admin.firestore();
  const ref = db.collection(collectionId).doc(documentId);
  const snap = await ref.get();
  if (!snap.exists) {
    if (collectionId === "service") {
      throw new Error("Missing service id");
    }
    throw new Error(`Not found ${collectionId}/${documentId}`);
  }
  let data: any = snap.data();
  data.id = documentId;
  return data;
};

/**
 * Get services list
 * @param {any} options
 */
export const getList = async (options: {
  collectionId: string,
  fullResponse?: boolean,
  limit?: number,
  orderBy?: {
    direction: FirebaseFirestore.OrderByDirection,
    key: string,
  },
  where?: Array<{
    field: string | FirebaseFirestore.FieldPath,
    filter: FirebaseFirestore.WhereFilterOp,
    value: any,
  }>,
}) => {
  if (!options.collectionId) {
    throw new Error("collectionId is undefined");
  }
  const db = admin.firestore();
  let ref: any = db.collection(options.collectionId);
  if (options.orderBy) {
    ref = ref.orderBy(options.orderBy.key, options.orderBy.direction);
  }
  const where = options.where;
  if (where && where.length > 0) {
    for (let i = 0; i < where.length; i++) {
      const item = where[i];
      ref = ref.where(item.field, item.filter, item.value);
    }
  }
  if (options.limit) {
    ref = ref.limit(options.limit);
  }
  const snapshot = await ref.get();
  if (!snapshot || !snapshot.docs || snapshot.empty) {
    return [];
  }
  const docs = snapshot.docs;
  if (!options.fullResponse) {
    return docs.map((doc) => doc.id);
  }
  // Return full data only when needed
  return docs.map((doc) => {
    let docData: any = doc.data();
    docData.id = doc.id;
    return docData;
  });
};
