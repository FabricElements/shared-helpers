/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import {MediaHelper} from "@fabricelements/shared-helpers";
import cors from "cors";
import express from "express";
import * as functions from "firebase-functions";
import {firebaseConfig, isBeta} from "../helpers/variables";

const mediaHelper = new MediaHelper({
  firebaseConfig,
  isBeta,
});
const app = express();

app.use(cors({origin: "*"}));

/**
 * Preview image from origin id or default image response
 */
app.get("/m/:id", async (request, response) => {
  const id = request.params.id || null;
  const size = request.query?.size?.toString();
  const crop = request.query?.hasOwnProperty("crop");
  await mediaHelper.preview({id, request, response, size, crop, path: "media"});
  return null;
});

/**
 * Preview image from origin id or default image response
 */
app.get("/avatar/:id", async (request, response) => {
  const id = request.params.id || null;
  const size = request.query?.size?.toString();
  const crop = request.query?.hasOwnProperty("crop");
  await mediaHelper.preview({id, request, response, size, crop, path: "avatar"});
  return null;
});

// Expose Express API as a single Cloud Function:
export default functions.runWith({
  memory: "1GB",
  timeoutSeconds: 60,
}).https.onRequest(app);
