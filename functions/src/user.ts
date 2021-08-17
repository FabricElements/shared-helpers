/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import {UserHelper} from "@fabricelements/shared-helpers";
import * as functions from "firebase-functions";

const userHelper = new UserHelper();

/**
 * User invitation function, it listens for a new connection-invite document creation, and creates the user
 */
export const invite = functions.runWith({
  memory: "512MB",
  timeoutSeconds: 30,
}).https.onCall(async (data, context) => {
  userHelper.authenticated(context);
  try {
    const role = await userHelper.getRole(context.auth.uid, data);
    userHelper.isAdmin({role, fail: true, collection: data?.collection});
    await userHelper.invite(data);
    return {message: "User Invited"};
  } catch (error) {
    throw new functions.https.HttpsError("unknown", error.message);
  }
});

/**
 * Remove a user invite
 */
export const remove = functions.runWith({
  memory: "512MB",
  timeoutSeconds: 30,
}).https.onCall(async (data, context) => {
  userHelper.authenticated(context);
  try {
    const role = await userHelper.getRole(context.auth.uid, data);
    userHelper.isAdmin({role, fail: true, collection: data?.collection});
    await userHelper.remove(data);
    return {message: "User Removed"};
  } catch (error) {
    throw new functions.https.HttpsError("unknown", error.message);
  }
});

/**
 * Remove a user invite
 */
export const updateRole = functions.runWith({
  memory: "512MB",
  timeoutSeconds: 30,
}).https.onCall(async (data, context) => {
  userHelper.authenticated(context);
  try {
    const role = await userHelper.getRole(context.auth.uid, data);
    userHelper.isAdmin({role, fail: true, collection: data?.collection});
    await userHelper.updateRole(data);
    return {message: "User Role Updated"};
  } catch (error) {
    throw new functions.https.HttpsError("unknown", error.message);
  }
});

/**
 * Validate if user exists or fail
 */
export const exists = functions.runWith({
  memory: "512MB",
  timeoutSeconds: 60,
}).https.onCall(async (data, context) => {
  try {
    const _exists = await userHelper.get(data);
    if (!_exists) {
      throw new Error("You are not registered. Please contact your account administrator to request access.");
    }
  } catch (error) {
    throw new functions.https.HttpsError("permission-denied", error.message);
  }
});

/**
 * Listener for user creation, initiates base fields
 */
export const created = functions.runWith({
  memory: "512MB",
  timeoutSeconds: 60,
}).auth.user().onCreate(async (user, context) => {
  await userHelper.createDocument(user);
});
