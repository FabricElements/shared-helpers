/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import {BigQuery} from '@google-cloud/bigquery';
import {logger} from 'firebase-functions/v2';

const bigquery = new BigQuery();

/**
 * BigQuery identifier pattern: letters, digits, and underscores only.
 * This matches the permitted characters for dataset names, table names,
 * and column/field names, preventing SQL injection via identifier interpolation.
 */
const BQ_IDENTIFIER_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

/**
 * Validates a single BigQuery identifier (dataset, table, or column name).
 *
 * BigQuery identifiers must start with a letter or underscore and contain only
 * letters, digits, and underscores.  Rejects empty strings and any value that
 * contains characters outside that set, preventing SQL injection through
 * template-literal identifier interpolation.
 *
 * @param {string} value - The identifier string to validate.
 * @param {string} label - Human-readable label used in the error message.
 * @throws {Error} When the value is empty or contains disallowed characters.
 */
const validateIdentifier = (value: string, label: string): void => {
  if (!value || !BQ_IDENTIFIER_RE.test(value)) {
    throw new Error(`Invalid BigQuery identifier for ${label}: "${value}"`);
  }
};

/**
 * Constructs a BigQuery DML statement that removes duplicate rows from a table.
 *
 * The generated `DELETE` statement keeps only the row with the maximum value
 * for `timestamp` per `id` (and optionally per `column`), effectively
 * de-duplicating the table in place.
 *
 * All identifier parameters are validated against the BigQuery identifier
 * character set before interpolation to prevent SQL injection.
 *
 * @param {object} filter - Descriptor for the target table and de-duplication columns.
 * @param {string} [filter.column] - Optional extra grouping column included in the
 *   `SELECT DISTINCT` and the `WHERE … NOT IN` sub-query.
 * @param {string} filter.dataset - BigQuery dataset identifier (required).
 * @param {string} filter.table - BigQuery table name within `dataset`.
 * @param {string} filter.timestamp - Name of the timestamp column used to pick the
 *   most-recent row when duplicates are detected.
 * @returns {string} A BigQuery-compatible SQL `DELETE` statement string.
 * @throws {Error} When `filter.dataset` is not provided or any identifier contains
 *   disallowed characters.
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
  validateIdentifier(filter.dataset, 'dataset');
  validateIdentifier(filter.table, 'table');
  validateIdentifier(filter.timestamp, 'timestamp');
  if (filter.column) validateIdentifier(filter.column, 'column');
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
 * All identifier parameters are validated before the SQL statement is built.
 * Side-effects: creates a BigQuery query job and waits for it to complete.
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
