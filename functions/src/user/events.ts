/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import {User} from '@fabricelements/shared-helpers';
import type {UserRecord} from 'firebase-admin/auth';
import * as functions from 'firebase-functions';
import {CloudFunction} from 'firebase-functions';
import {mainUrl} from '../helpers/variables.js';

/**
 * Listener for user creation, initiates base fields
 */
export const created: CloudFunction<UserRecord> = functions.runWith({
  memory: '512MB',
  timeoutSeconds: 60,
}).auth.user().onCreate(async (user) => {
  await User.Helper.onCreate(user, mainUrl);
});
