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
app.get("/media/**", async (request, response) => {
  const query = request.query ?? {};
  await mediaHelper.preview({request, response, ...query, path: request.path});
  return null;
});

// Expose Express API as a single Cloud Function:
export default functions.runWith({
  memory: "1GB",
  timeoutSeconds: 60,
}).https.onRequest(app);
