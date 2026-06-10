/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
/**
 * Calculates the recommended message dispatch throughput for a Twilio account.
 *
 * Given the available execution window, a per-message sleep delay, and the
 * number of concurrent instances, the function computes how many messages can
 * be sent per second, minute, hour, and day while staying within Twilio's
 * rate limits.  The result is scaled by `instances` to reflect a multi-replica
 * deployment.
 *
 * @param {object} [options] - Optional configuration overrides for the speed calculation.
 * @param {number} [options.instances] - Number of concurrent function instances.
 *   Defaults to `1`.
 * @param {number} [options.sleep] - Per-message sleep time in milliseconds added on top
 *   of the fixed 400 ms execution time estimate.  Defaults to `40`.
 * @param {number} [options.time] - Total available time window in seconds over which the
 *   rate limit applies.  Defaults to `50`.
 * @returns {object} An object containing:
 *   - `instances` — the resolved number of instances.
 *   - `limit` — maximum messages per time window for a single instance.
 *   - `sleep` — the resolved sleep time in milliseconds.
 *   - `speed` — per-`second`, `minute`, `hour`, and `day` throughput values
 *     scaled by `instances`.
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
