/**
 * Big Query Clean Database
 * @param {any} filter
 * @return {Promise<void>}
 */
declare const _default: (filter: {
    column?: string;
    dataset: string;
    table: string;
    timestamp: string;
}) => Promise<void>;
export default _default;
