/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import {PubSub} from '@google-cloud/pubsub';
import {Attributes, PublishOptions} from '@google-cloud/pubsub/build/src/publisher/index.js';
import {logger} from 'firebase-functions/v2';
import {emulator} from './variables.js';

/**
 * Publishes a JSON-serialised message to a Google Cloud Pub/Sub topic.
 *
 * Serialises `data` to a JSON string, encodes it as a `Buffer`, and publishes
 * it via the supplied `PubSub` client instance with the provided `attributes`
 * and publisher `options`.  When running inside the Firebase Functions emulator
 * the message ID and payload are logged for debugging.  On failure the error is
 * logged and `process.exitCode` is set to `1` without re-throwing, so the
 * Cloud Function can finish cleanly.
 *
 * @param ps - An initialised `PubSub` client used to obtain the topic handle.
 * @param topic - The fully qualified or short Pub/Sub topic name to publish to.
 * @param data - Arbitrary JSON-serialisable payload object.  Defaults to `{}`.
 * @param attributes - Key-value string attributes attached to the message.
 *   Defaults to `{}`.
 * @param options - Publisher configuration options (e.g., batching, retry
 *   settings).  Defaults to `{}`.
 * @returns A Promise that resolves when the publish call completes or when the
 *   error has been logged.
 */
export default async (ps: PubSub, topic: string, data: object = {}, attributes: Attributes = {}, options: PublishOptions = {}) => {
  const message = JSON.stringify(data);
  const dataBuffer = Buffer.from(message);
  const topicClass = ps.topic(topic, options);
  try {
    const messageId = await topicClass.publishMessage({data: dataBuffer, attributes});
    if (emulator) logger.log(`Message ${messageId} published with data: ${JSON.stringify(data)}`);
  } catch (error: any) {
    logger.error(`Received error while publishing: ${error.message ?? error.toString()}`);
    process.exitCode = 1;
  }
};
