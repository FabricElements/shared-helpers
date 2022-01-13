/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import {UserHelper} from '@fabricelements/shared-helpers';
import admin from 'firebase-admin';
import functions from 'firebase-functions';

const userHelper = new UserHelper();

/**
 * Listener for user creation, initiates base fields
 */
export const created = functions.runWith({
  memory: '512MB',
  timeoutSeconds: 60,
}).auth.user().onCreate(async (user, context) => {
  await userHelper.createDocument(user);
});

/**
 * Organization contact is created
 *
 * @type {CloudFunction<DocumentSnapshot>}
 */
export const createdDoc = functions.runWith({
  memory: '512MB',
  timeoutSeconds: 60,
}).firestore.document('user/{userId}').onCreate(async (snap, context) => {
  const timestamp = admin.firestore.FieldValue.serverTimestamp();
  const data = snap.data();
  const baseData: any = {
    backup: false,
    updated: timestamp,
  };
  if (!data.language) {
    baseData.language = 'en';
  }
  if (!data.role) {
    baseData.role = 'user';
  }
  if (!data.created) {
    baseData.created = timestamp;
  }
  await snap.ref.set(baseData, {merge: true});
});
