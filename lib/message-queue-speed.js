"use strict";
/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Returns the recommended speed to send messages to a Twilio account
 *
 * @param options
 */
exports.default = (options) => {
    var _a, _b, _c;
    const timeInSeconds = (_a = options === null || options === void 0 ? void 0 : options.time) !== null && _a !== void 0 ? _a : 50;
    const sleepTime = (_b = options === null || options === void 0 ? void 0 : options.sleep) !== null && _b !== void 0 ? _b : 40;
    const instances = (_c = options === null || options === void 0 ? void 0 : options.instances) !== null && _c !== void 0 ? _c : 1;
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