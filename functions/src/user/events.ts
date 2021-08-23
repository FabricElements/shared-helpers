/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import {UserHelper} from "@fabricelements/shared-helpers";
import * as admin from "firebase-admin";
import * as functions from "firebase-functions";

const userHelper = new UserHelper();

const timestamp = admin.firestore.FieldValue.serverTimestamp();

const db = admin.firestore();

/**
 * Listener for user creation, initiates base fields
 */
export const created = functions.runWith({
  memory: "512MB",
  timeoutSeconds: 60,
}).auth.user().onCreate(async (user, context) => {
  await userHelper.createDocument(user);
});
