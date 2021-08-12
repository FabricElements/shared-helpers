/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import admin from "firebase-admin";

/**
 * Init firebase app first
 */
if (!admin.apps.length) {
  admin.initializeApp();
}


/**
 * Export app modules after the app is initialized
 */
export * from "./app.js";
