/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
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
/**
 * Returns the recommended speed to send messages to a Twilio account
 *
 * @param {any} options
 * @return {any}
 */
export default _default;
