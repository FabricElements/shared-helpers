/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import {UserHelper} from '@fabricelements/shared-helpers';
import {https} from 'firebase-functions/v2';
import {firebaseConfig, isBeta, mainUrl} from '../helpers/variables.js';

const userHelper = new UserHelper({firebaseConfig, isBeta, mainUrl});

/**
 * Validate if user exists or fail
 */
export const exists = https.onCall({
  memory: '512MiB',
  timeoutSeconds: 60,
}, async (request) => {
  try {
    const _exists = await userHelper.get(request.data);
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
export const invite = https.onCall({
  memory: '512MiB',
  timeoutSeconds: 30,
}, async (request) => {
  userHelper.authenticated(request);
  try {
    const role = await userHelper.getRole(request.auth.uid, request.data);
    userHelper.isAdmin({role, fail: true, group: request.data?.group});
    await userHelper.invite(request.data);
    return {message: 'User Invited'};
  } catch (error) {
    // @ts-ignore
    throw new https.HttpsError('unknown', error.message);
  }
});

/**
 * Remove a user invite
 */
export const remove = https.onCall({
  memory: '512MiB',
  timeoutSeconds: 30,
}, async (request) => {
  userHelper.authenticated(request);
  try {
    const role = await userHelper.getRole(request.auth.uid, request.data);
    userHelper.isAdmin({role, fail: true, group: request.data?.group});
    await userHelper.remove(request.data);
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
  userHelper.authenticated(request);
  try {
    await userHelper.update({data: request.data, id: request.auth.uid});
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
  userHelper.authenticated(request);
  try {
    const _role = await userHelper.getRole(request.auth.uid, request.data);
    userHelper.isAdmin({role: _role, fail: true, group: request.data?.group});
    await userHelper.updateRole(request.data);
    return {message: 'User Role Updated'};
  } catch (error) {
    // @ts-ignore
    throw new https.HttpsError('unknown', error.message);
  }
});

