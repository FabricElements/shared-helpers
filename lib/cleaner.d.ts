/**
 * Submits the de-duplication query to BigQuery as an asynchronous job and
 * waits for results, logging a warning on failure without re-throwing.
 *
 * Reads the `FIREBASE_CONFIG` environment variable to construct the SQL
 * targeting the specified dataset and table.  Side-effects: creates a
 * BigQuery query job and waits for it to complete.
 *
 * @param {object} filter - Descriptor for the target table and de-duplication columns.
 * @param {string} [filter.column] - Optional extra grouping column.
 * @param {string} filter.dataset - BigQuery dataset identifier.
 * @param {string} filter.table - BigQuery table name within `dataset`.
 * @param {string} filter.timestamp - Name of the timestamp column.
 * @returns {Promise<void>} A Promise that resolves when the BigQuery job finishes, or
 *   resolves silently after logging a warning if the job fails.
 */
declare const _default: (filter: {
    column?: string;
    dataset: string;
    table: string;
    timestamp: string;
}) => Promise<void>;
export default _default;
