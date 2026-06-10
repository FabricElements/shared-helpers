/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import {BigQuery} from '@google-cloud/bigquery';
import {logger} from 'firebase-functions/v2';

const bigquery = new BigQuery();

/**
 * Constructs a BigQuery DML statement that removes duplicate rows from a table.
 *
 * The generated `DELETE` statement keeps only the row with the maximum value
 * for `timestamp` per `id` (and optionally per `column`), effectively
 * de-duplicating the table in place.
 *
 * @param {object} filter - Descriptor for the target table and de-duplication columns.
 * @param {string} [filter.column] - Optional extra grouping column included in the
 *   `SELECT DISTINCT` and the `WHERE … NOT IN` sub-query.
 * @param {string} filter.dataset - BigQuery dataset identifier (required).
 * @param {string} filter.table - BigQuery table name within `dataset`.
 * @param {string} filter.timestamp - Name of the timestamp column used to pick the
 *   most-recent row when duplicates are detected.
 * @returns {string} A BigQuery-compatible SQL `DELETE` statement string.
 * @throws {Error} When `filter.dataset` is not provided.
 */
const query = (filter: {
  column?: string,
  dataset: string,
  table: string,
  timestamp: string,
}): string => {
  if (!filter.dataset) {
    throw new Error('Dataset or Table not defined');
  }
  return `DELETE
          FROM \`${filter.dataset}.${filter.table}\`
          WHERE STRUCT(id,
                       ${filter.timestamp}
    ${filter.column ? `,${filter.column}` : ''}) NOT IN (SELECT
            AS STRUCT id
              , ${filter.timestamp} ${filter.column ? `,${filter.column}` : ''}
          FROM (
            SELECT
            DISTINCT id, MAX (${filter.timestamp}) AS ${filter.timestamp}
            ${filter.column ? `,${filter.column}` : ''}
            FROM
              \`${filter.dataset}.${filter.table}\`
            GROUP BY
            id ${filter.column ? `,${filter.column}` : ''} ));`;
};

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
export default async (filter: {
  column?: string,
  dataset: string,
  table: string,
  timestamp: string,
}): Promise<void> => {
  const sqlQuery = query(filter);
  try {
    const [job] = await bigquery.createQueryJob({
      query: sqlQuery,
    });
    const [list] = await job.getQueryResults();
    logger.info(`Result delete duplicates ${list}`);
  } catch (error) {
    logger.warn(`Fail delete duplicates. Dataset: ${filter.dataset}, table: ${filter.table}`, error);
  }
};
