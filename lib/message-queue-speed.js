/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
/**
 * Returns the recommended speed to send messages to a Twilio account
 *
 * @param {object} options
 * @return {object}
 */
export default (options) => {
    const timeInSeconds = options?.time ?? 50;
    const sleepTime = options?.sleep ?? 40;
    const instances = options?.instances ?? 1;
    // Time in milliseconds
    const limitMilliseconds = timeInSeconds * 1000;
    const executionTime = 400; // Time to send the messages to provider
    const messageTotalTime = executionTime + sleepTime;
    const limitMessages = Math.floor(limitMilliseconds / messageTotalTime);
    const messagesPerSecond = limitMessages / timeInSeconds;
    const messagesPerMinute = Math.floor(messagesPerSecond * 60);
    const messagesPerHour = messagesPerMinute * 60;
    const messagesPerDay = messagesPerHour * 5;
    const speed = {
        second: messagesPerSecond * instances,
        minute: messagesPerMinute * instances,
        hour: messagesPerHour * instances,
        day: messagesPerDay * instances,
    };
    return {
        instances,
        limit: limitMessages,
        sleep: sleepTime,
        speed,
    };
};
//# sourceMappingURL=message-queue-speed.js.map