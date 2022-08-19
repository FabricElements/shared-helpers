/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import {MediaHelper} from '@fabricelements/shared-helpers';
import express from 'express';
import {https} from 'firebase-functions/v2';
import {firebaseConfig, isBeta} from '../helpers/variables.js';

const mediaHelper = new MediaHelper({
  firebaseConfig,
  isBeta,
});
const app = express();

/**
 * Preview image from origin id or default image response
 */
app.get('/media/**', async (request, response) => {
  const query = request.query ?? {};
  await mediaHelper.preview({request, response, ...query, path: request.path});
  return null;
});

const runFunction = https.onRequest({
  memory: '1GiB',
  timeoutSeconds: 60,
  cors: '*',
}, app);

export default runFunction;
