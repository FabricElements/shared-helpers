/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import {User} from '@fabricelements/shared-helpers';
import {FieldValue} from 'firebase-admin/firestore';
import * as functions from 'firebase-functions';

/**
 * Listener for user creation, initiates base fields
 */
export const created = functions.runWith({
  memory: '512MB',
  timeoutSeconds: 60,
}).auth.user().onCreate(async (user) => {
  await User.Helper.createDocument(user);
});

/**
 * User is created
 */
export const createdDoc = functions.runWith({
  memory: '512MB',
  timeoutSeconds: 60,
}).firestore.document('user/{userId}').onCreate(async (snap) => {
  const timestamp = FieldValue.serverTimestamp();
  const data = snap.data();
  const baseData: any = {
    backup: false,
    updated: timestamp,
  };
  if (!data.language) baseData.language = 'en';
  if (!data.role) baseData.role = 'user';
  if (!data.created) baseData.created = timestamp;
  await snap.ref.set(baseData, {merge: true});
});
