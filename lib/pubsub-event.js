/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
/**
 * PubSub basic event
 *
 * @param {any} ps
 * @param {string} topic
 * @param {object} data
 * @param {any} attributes
 * @param {any} options
 */
export default async (ps, topic, data = {}, attributes = {}, options = {}) => {
    const message = JSON.stringify(data);
    const dataBuffer = Buffer.from(message);
    await ps.topic(topic, {}).publish(dataBuffer, attributes);
};
//# sourceMappingURL=pubsub-event.js.map