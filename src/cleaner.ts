/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import {BigQuery} from '@google-cloud/bigquery';
import {logger} from 'firebase-functions/v2';

const bigquery = new BigQuery();

/**
 * Create Query for Delete Duplicates.
 * @param {any} filter
 * @return {string}
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
FROM
  \`${filter.dataset}.${filter.table}\`
WHERE
  STRUCT(id,
    ${filter.timestamp}
    ${filter.column ? `,${filter.column}` : ''} ) NOT IN (
  SELECT
    AS STRUCT id,
    ${filter.timestamp}
    ${filter.column ? `,${filter.column}` : ''}
  FROM (
    SELECT
      DISTINCT id,
      MAX(${filter.timestamp}) AS ${filter.timestamp}
      ${filter.column ? `,${filter.column}` : ''}
    FROM
      \`${filter.dataset}.${filter.table}\`
    GROUP BY
      id ${filter.column ? `,${filter.column}` : ''} ));`;
};

/**
 * Big Query Clean Database
 * @param {any} filter
 * @return {Promise<void>}
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
