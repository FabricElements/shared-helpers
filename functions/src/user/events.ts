/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import {User} from '@fabricelements/shared-helpers/user';
import type {UserRecord} from 'firebase-admin/auth';
import {beforeUserCreated} from 'firebase-functions/v2/identity';
import {mainUrl} from '../helpers/variables.js';

/**
 * Firebase Auth blocking function that initialises a new user's Firestore document.
 *
 * Triggered automatically by the Firebase Authentication service whenever a new user
 * account is about to be created (via any sign-in provider).  Delegates to
 * `User.Helper.onCreate`, which merges any pre-existing Firestore data for the UID,
 * sets default role and onboarding fields, and — when the Auth record includes a
 * `photoURL` — downloads the photo and saves it to `media/user/{uid}/avatar` in
 * Firebase Storage before updating the Auth profile with the project's internal
 * media URL.
 *
 * Memory: 512 MiB | Timeout: 60 s
 *
 * @param {AuthBlockingEvent} event - The Gen-2 `beforeUserCreated` blocking event.
 *   `event.data` contains the `AuthUserRecord` with UID, email, phone, and
 *   provider-supplied photo URL for the user about to be created.
 * @returns {Promise<void>} A Promise that resolves when the Firestore document and any
 *   avatar migration have completed.
 */
export const created = beforeUserCreated({
  memory: '512MiB',
  timeoutSeconds: 60,
}, async (event) => {
  const user = event.data;
  if (!user) return;
  await User.Helper.onCreate(user as unknown as UserRecord, mainUrl);
});
