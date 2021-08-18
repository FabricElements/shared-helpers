/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import {ImageHelper, interfaces, MediaHelper, UserHelper} from "@fabricelements/shared-helpers";
import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import {firebaseConfig, isBeta, mainUrl} from "../helpers/variables";

const userHelper = new UserHelper();
const db = admin.firestore();
const timestamp = admin.firestore.FieldValue.serverTimestamp();

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
 * Request create service
 *
 * @type {HttpsFunction}
 */
export const update = functions.runWith({
  memory: "512MB",
  timeoutSeconds: 30,
}).https.onCall(async (data, context) => {
  const imageHelper = new ImageHelper({
    firebaseConfig,
    isBeta,
  });
  const mediaHelper = new MediaHelper({
    firebaseConfig,
    isBeta,
  });
  if (!context.auth) {
    // Throwing an HttpsError so that the client gets the error details.
    throw new functions.https.HttpsError("failed-precondition",
      "The function must be called while authenticated.");
  }
  try {
    const uid = context.auth?.uid;
    const {nameFirst, nameLast, avatar} = data;
    const hasNameFirst = nameFirst && nameFirst.length <= 2;
    const hasNameLast = nameLast && nameLast.length <= 2;
    const correctNameFirst = nameFirst && nameFirst.length > 2 ? nameFirst : undefined;
    const correctNameLast = nameLast && nameLast.length > 2 ? nameLast : undefined;
    if (hasNameFirst) {
      throw new Error("First Name must be at least 3 characters");
    }
    if (hasNameLast) {
      throw new Error("Last Name must be at least 3 characters");
    }
    const updateName = correctNameFirst && correctNameLast;
    if (!(updateName)) {
      throw new Error("Incomplete data");
    }
    const ref = db.collection("user").doc(uid);
    let name = updateName ? `${nameFirst} ${nameLast}` : undefined;
    let updateDataFirestore: any = {};
    let updateDataUser: any = {};
    if (updateName) {
      updateDataFirestore = {
        nameFirst: correctNameFirst,
        nameLast: correctNameLast,
      };
      updateDataUser = {
        displayName: name,
      };
    }

    if (avatar) {
      const uri = avatar.split(";base64,").pop();
      let imgBuffer = Buffer.from(uri, "base64");
      const imageSize = imageHelper.size("standard");
      // const buffer = Buffer.from(avatar, "base64");
      // const _buffer = await fetch(avatar);
      // const buffer = await b64toBlob(avatar);
      // const buffer = new Blob(avatar, {type: "image/jpeg"});
      let imageResizeOptions: interfaces.InterfaceImageResize = {
        maxHeight: imageSize.height,
        maxWidth: imageSize.width,
        crop: true,
        input: imgBuffer,
        quality: 90,
        format: "jpeg",
      };
      const media = await imageHelper.bufferImage(imageResizeOptions);
      await mediaHelper.save({
        media,
        id: uid,
        path: "avatar",
        contentType: "image/jpeg",
      });
      updateDataFirestore.avatar = true;
      updateDataUser.photoURL = `${mainUrl}/avatar/${uid}`;
    }
    if (!Object.keys(updateDataFirestore).length) {
      throw new Error("No changes detected");
    }
    await admin
      .auth()
      .updateUser(uid, updateDataUser);
    await ref.set({
      ...updateDataFirestore,
      updated: timestamp,
    }, {merge: true});
    return {
      message: "Profile updated",
    };
  } catch (error) {
    throw new functions.https.HttpsError("failed-precondition", error.message);
  }
});
