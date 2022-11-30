/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import admin from 'firebase-admin';

/**
 * Init firebase app first
 */
if (!admin.apps.length) {
  admin.initializeApp();
  const db = admin.firestore();
  db.settings({ignoreUndefinedProperties: true});
}

/**
 * Export app modules after the app is initialized
 */
export * from './app.js';
