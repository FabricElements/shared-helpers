/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import {User} from '@fabricelements/shared-helpers/user';
import * as functions from 'firebase-functions';
import {mainUrl} from '../helpers/variables.js';

/**
 * Listener for user creation, initiates base fields
 */
export const created = functions.runWith({
  memory: '512MB',
  timeoutSeconds: 60,
}).auth.user().onCreate(async (user) => {
  // @ts-ignore
  await User.Helper.onCreate(user, mainUrl);
});
