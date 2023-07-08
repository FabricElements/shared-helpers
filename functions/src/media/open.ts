/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import {Media} from '@fabricelements/shared-helpers/media';
import express from 'express';
import {https} from 'firebase-functions/v2';

const app = express();
const cacheTime = 86400000 * 7; // 7 days

/**
 * Preview image from origin id or default image response
 */
app.get('/media/**', async (request, response) => {
  const query = request.query ?? {};
  await Media.Helper.preview({request, response, ...query, path: request.path, cacheTime: cacheTime});
  return null;
});

const defaultFunction = https.onRequest({
  memory: '1GiB',
  timeoutSeconds: 60,
  cors: '*',
}, app);

export default defaultFunction;
