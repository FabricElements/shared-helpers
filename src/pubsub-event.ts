/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import {PubSub} from '@google-cloud/pubsub';
import {Attributes, PublishOptions} from '@google-cloud/pubsub/build/src/publisher/index.js';
import {logger} from 'firebase-functions/v2';
import {emulator} from './variables.js';

/**
 * PubSub basic event
 *
 * @param {PubSub} ps
 * @param {string} topic
 * @param {object} data
 * @param {any} attributes
 * @param {any} options
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
