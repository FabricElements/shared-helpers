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
declare const _default: (options?: {
    instances?: number;
    sleep?: number;
    time?: number;
}) => {
    instances: number;
    limit: number;
    sleep: number;
    speed: {
        second: number;
        minute: number;
        hour: number;
        day: number;
    };
};
export default _default;
