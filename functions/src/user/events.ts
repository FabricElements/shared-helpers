/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import {User} from '@fabricelements/shared-helpers/user';
import * as functions from 'firebase-functions';
import {mainUrl} from '../helpers/variables.js';

/**
 * Firebase Auth `onCreate` event listener that initialises a new user's Firestore document.
 *
 * Triggered automatically by the Firebase Authentication service whenever a new user
 * account is created (via any sign-in provider).  Delegates to `User.Helper.onCreate`,
 * which merges any pre-existing Firestore data for the UID, sets default role and
 * onboarding fields, and — when the Auth record includes a `photoURL` — downloads
 * the photo and saves it to `media/user/{uid}/avatar` in Firebase Storage before
 * updating the Auth profile with the project's internal media URL.
 *
 * Memory: 512 MB | Timeout: 60 s
 *
 * @param {functions.auth.UserRecord} user - The Firebase Auth `UserRecord` provided by
 *   the `onCreate` trigger containing UID, email, phone, and provider-supplied photo URL.
 * @returns {Promise<void>} A Promise that resolves when the Firestore document and any
 *   avatar migration have completed.
 */
export const created = functions.runWith({
  memory: '512MB',
  timeoutSeconds: 60,
}).auth.user().onCreate(async (user) => {
  // @ts-ignore
  await User.Helper.onCreate(user, mainUrl);
});
