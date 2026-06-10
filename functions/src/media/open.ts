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
 * Express GET route that streams a media file from Firebase Storage to the client.
 *
 * Matches any path under `/media/**` and delegates to `Media.Helper.preview`,
 * forwarding query-string parameters (e.g., `size`, `format`, `width`, `height`,
 * `quality`, `crop`, `dpr`) alongside the resolved storage path and a 7-day
 * cache duration.  The helper handles image resizing, `Cache-Control` headers,
 * robot-indexing tags, and `404` fallbacks internally.
 *
 * @param {express.Request} request - The incoming Express request; query parameters
 *   are forwarded directly to `Media.Helper.preview`.
 * @param {express.Response} response - The Express response used to send the file
 *   buffer or a status code.
 * @returns {Promise<null>} Always resolves to `null` after the preview helper returns.
 */
app.get('/media/**', async (request, response) => {
  const query = request.query ?? {};
  await Media.Helper.preview({response, ...query, path: request.path, cacheTime: cacheTime});
  return null;
});

/**
 * Firebase HTTPS Cloud Function that serves the media Express application.
 *
 * Configured with 1 GiB of memory and a 60-second timeout to accommodate
 * image-resize operations on large files.  CORS is open (`'*'`) so that
 * any origin (including browser clients) can fetch media directly.
 */
const defaultFunction = https.onRequest({
  memory: '1GiB',
  timeoutSeconds: 60,
  cors: '*',
}, app);

export default defaultFunction;
