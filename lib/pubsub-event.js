import { emulator } from './variables.js';
import { logger } from 'firebase-functions/v2';
/**
 * PubSub basic event
 *
 * @param {PubSub} ps
 * @param {string} topic
 * @param {object} data
 * @param {any} attributes
 * @param {any} options
 */
export default async (ps, topic, data = {}, attributes = {}, options = {}) => {
    const message = JSON.stringify(data);
    const dataBuffer = Buffer.from(message);
    const topicClass = ps.topic(topic, options);
    try {
        const messageId = await topicClass.publishMessage({ data: dataBuffer, attributes });
        if (emulator)
            logger.log(`Message ${messageId} published with data: ${JSON.stringify(data)}`);
    }
    catch (error) {
        logger.error(`Received error while publishing: ${error.message ?? error.toString()}`);
        process.exitCode = 1;
    }
};
//# sourceMappingURL=pubsub-event.js.map