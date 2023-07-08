/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import {User} from '@fabricelements/shared-helpers';
import {https} from 'firebase-functions/v2';
import {mainUrl} from '../helpers/variables.js';

/**
 * Validate if user exists or fail
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
 * User invitation function, it listens for a new connection-invite document creation, and creates the user
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
 * Remove a user role
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
    // @ts-ignore
    throw new https.HttpsError('unknown', error.message);
  }
});

/**
 * Update User data
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
 * Update User Role
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
    // @ts-ignore
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

