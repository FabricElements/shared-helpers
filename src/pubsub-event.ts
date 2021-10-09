/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */

/**
 * PubSub basic event
 * @param ps
 * @param topic
 * @param data
 * @param attributes
 * @param options
 */
export default async (ps: any, topic: string, data: object = {}, attributes: any = {}, options: any = {}) => {
  const message = JSON.stringify(data);
  const dataBuffer = Buffer.from(message);
  await ps.topic(topic, {}).publish(dataBuffer, attributes);
};
