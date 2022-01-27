/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
// import * as admin from 'firebase-admin';
import {getApps, initializeApp} from 'firebase-admin/app';

/**
 * Init firebase app first
 */
// if (!admin.apps.length) {
//   admin.initializeApp();
// }
if (!getApps.length) {
  initializeApp();
}
/**
 * Export app modules after the app is initialized
 */
export * from './app.js';
