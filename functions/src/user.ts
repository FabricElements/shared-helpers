/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
// @ts-ignore
import {UserHelper} from "@fabricelements/shared-helpers";
// tslint:disable-next-line:no-implicit-dependencies
import * as functions from "firebase-functions";

const userHelper = new UserHelper();

/**
 * User invitation function, it listens for a new connection-invite document creation, and creates the user
 */
export const invite = functions.https.onCall(async (data, context) => {
  try {
    await userHelper.invite(data);
    return {message: "User Invited"};
  } catch (error) {
    // @ts-ignore
    throw new functions.https.HttpsError("unknown", error.message);
  }
});

/**
 * Remove a user invite
 *
 * @type {HttpsFunction}
 */
export const remove = functions.https.onCall(async (data, context) => {
  try {
    await userHelper.remove(data);
    return {message: "User Removed"};
  } catch (error) {
    // @ts-ignore
    throw new functions.https.HttpsError("unknown", error.message);
  }
});

/**
 * Remove a user invite
 *
 * @type {HttpsFunction}
 */
export const exists = functions.https.onCall(async (data, context) => {
  try {
    const _exists = await userHelper.exists(data);
    return {message: `User DO ${!_exists ? "NOT" : ""} exists`};
  } catch (error) {
    // @ts-ignore
    throw new functions.https.HttpsError("unknown", error.message);
  }
});
