/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import {User} from '@fabricelements/shared-helpers/user';
import {https} from 'firebase-functions/v2';
import {mainUrl} from '../helpers/variables.js';

/**
 * Firebase callable Cloud Function that verifies a user exists in Firebase Auth.
 *
 * Accepts a `User.Interface` payload and calls `User.Helper.get` to look up
 * the user by email, phone, or UID.  Returns `{message: 'User Exists'}` on
 * success.  Throws a `permission-denied` HttpsError when the user is not found
 * or when `Helper.get` rejects.
 *
 * Memory: 512 MiB | Timeout: 60 s
 */
export const exists = https.onCall({
  memory: '512MiB',
  timeoutSeconds: 60,
}, async (request) => {
  const data: User.Interface = request.data;
  try {
    const _exists = await User.Helper.get(data);
    if (!_exists) {
      throw new Error('You are not registered. Please contact your account administrator to request access.');
    }
  } catch (error) {
    // @ts-ignore
    throw new https.HttpsError('permission-denied', error.message);
  }
  return {message: 'User Exists'};
});

/**
 * Firebase callable Cloud Function that invites a new user to the platform.
 *
 * Requires the caller to be authenticated and to hold an admin role (checked
 * via `User.Helper.getRole` and `User.Helper.isAdmin`).  Delegates user
 * creation and role assignment to `User.Helper.add`.  Returns
 * `{message: 'User Invited'}` on success.  Throws an `unknown` HttpsError
 * on any failure.
 *
 * Memory: 512 MiB | Timeout: 30 s
 */
export const add = https.onCall({
  memory: '512MiB',
  timeoutSeconds: 30,
}, async (request) => {
  User.Helper.authenticated(request.auth);
  const data: User.Interface = request.data;
  try {
    const role = await User.Helper.getRole(request.auth.uid, data?.role);
    User.Helper.isAdmin({role, fail: true, group: data?.group});
    await User.Helper.add(data);
    return {message: 'User Invited'};
  } catch (error) {
    // @ts-ignore
    throw new https.HttpsError('unknown', error.message);
  }
});

/**
 * Firebase callable Cloud Function that removes a user or their group role.
 *
 * Requires the caller to be authenticated and to hold an admin role.  Delegates
 * to `User.Helper.remove`, which either deletes the Auth account and Firestore
 * document (when no group is set) or strips only the group-scoped role.  Returns
 * `{message: 'User Removed'}` on success.  Throws an `unknown` HttpsError on failure.
 *
 * Memory: 512 MiB | Timeout: 30 s
 */
export const remove = https.onCall({
  memory: '512MiB',
  timeoutSeconds: 30,
}, async (request) => {
  User.Helper.authenticated(request.auth);
  const data: User.Interface = request.data;
  try {
    const role = await User.Helper.getRole(request.auth.uid, data?.role);
    User.Helper.isAdmin({role, fail: true, group: data?.group});
    await User.Helper.remove(data);
    return {message: 'User Removed'};
  } catch (error) {
    // @ts-expect-error
    throw new https.HttpsError('unknown', error.message);
  }
});

/**
 * Firebase callable Cloud Function that updates the authenticated user's profile.
 *
 * Accepts a `User.Interface` payload, merges it with the caller's UID, and
 * delegates to `User.Helper.update`.  Returns `{message: 'Profile updated'}` on
 * success.  Throws a `failed-precondition` HttpsError when the update fails (e.g.,
 * no detectable changes or a name-validation error).
 *
 * Memory: 512 MiB | Timeout: 30 s
 */
export const update = https.onCall({
  memory: '512MiB',
  timeoutSeconds: 30,
}, async (request) => {
  User.Helper.authenticated(request.auth);
  const data: User.Interface = request.data;
  try {
    await User.Helper.update({...data, id: request.auth.uid}, mainUrl);
  } catch (error) {
    // @ts-ignore
    throw new https.HttpsError('failed-precondition', error.message);
  }
  return {
    message: 'Profile updated',
  };
});

/**
 * Firebase callable Cloud Function that updates a user's role.
 *
 * Requires the caller to be authenticated and hold an admin role.  Verifies
 * admin access before calling `User.Helper.updateRole`.  If `firstName` or
 * `lastName` is also provided in the payload, `User.Helper.update` is called
 * subsequently to sync the display name.  Returns `{message: 'User Updated'}`
 * on success.  Throws `permission-denied` for insufficient permissions and
 * `unknown` / `failed-precondition` for other errors.
 *
 * Memory: 512 MiB | Timeout: 30 s
 */
export const role = https.onCall({
  memory: '512MiB',
  timeoutSeconds: 30,
}, async (request) => {
  User.Helper.authenticated(request.auth);
  const data: User.Interface = request.data;
  try {
    const _role = await User.Helper.getRole(request.auth.uid, data?.role);
    User.Helper.isAdmin({role: _role, fail: true, group: data?.group});
  } catch (error) {
    // @ts-expect-error
    throw new https.HttpsError('permission-denied', error.message);
  }
  try {
    await User.Helper.updateRole(data, mainUrl);
  } catch (error: any) {
    throw new https.HttpsError('unknown', error.message);
  }
  if (data.firstName || data.lastName) {
    try {
      await User.Helper.update(data, mainUrl);
    } catch (error: any) {
      throw new https.HttpsError('failed-precondition', error.message);
    }
  }
  return {message: 'User Updated'};
});

