/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import {MediaHelper} from '@fabricelements/shared-helpers';
import compression from 'compression';
import cors from 'cors';
import express from 'express';
import * as functions from 'firebase-functions';
import {firebaseConfig, isBeta} from '../helpers/variables.js';

/**
 * Validate if response should be compressed
 * @param {Request} req
 * @param {Response} res
 * @return {any}
 */
function shouldCompress(req, res) {
  if (req.headers['x-no-compression']) {
    // don't compress responses with this request header
    return false;
  }
  // fallback to standard filter function
  return compression.filter(req, res);
}

const mediaHelper = new MediaHelper({
  firebaseConfig,
  isBeta,
});
const app = express();

app.use(cors({origin: '*'}));
app.use(compression({filter: shouldCompress}));

/**
 * Preview image from origin id or default image response
 */
app.get('/media/**', async (request, response) => {
  const query = request.query ?? {};
  await mediaHelper.preview({request, response, ...query, path: request.path});
  return null;
});

// Expose Express API as a single Cloud Function:
export default functions.runWith({
  memory: '1GB',
  timeoutSeconds: 60,
}).https.onRequest(app);
