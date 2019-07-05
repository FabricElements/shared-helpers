/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import {BigQuery} from "@google-cloud/bigquery";

const bigquery = new BigQuery();

/**
 * Create Query for Delete Duplicates.
 * @param filter
 */
const query = (filter: {
  column?: string,
  dataset: string,
  table: string,
  timestamp: string,
}) => {
  if (!filter.dataset) {
    throw new Error("Dataset or Table not defined");
  }
  return `DELETE
FROM
  \`${filter.dataset}.${filter.table}\`
WHERE
  STRUCT(id,
    ${filter.timestamp}
    ${filter.column ? `,${filter.column}` : ""} ) NOT IN (
  SELECT
    AS STRUCT id,
    ${filter.timestamp}
    ${filter.column ? `,${filter.column}` : ""}
  FROM (
    SELECT
      DISTINCT id,
      MAX(${filter.timestamp}) AS ${filter.timestamp}
      ${filter.column ? `,${filter.column}` : ""}
    FROM
      \`${filter.dataset}.${filter.table}\`
    GROUP BY
      id ${filter.column ? `,${filter.column}` : ""} ));`;
};

/**
 * Big Query Clean Database
 * @param filter
 */
export default async (filter: {
  column?: string,
  dataset: string,
  table: string,
  timestamp: string,
}) => {
  const sqlQuery = query(filter);
  try {
    const [job] = await bigquery.createQueryJob({
      query: sqlQuery,
    });
    const [list] = await job.getQueryResults();
    console.info(`Result delete duplicates ${list}`);
  } catch (error) {
    console.warn(`Fail delete duplicates. Dataset: ${filter.dataset}, table: ${filter.table}`, error);
    return [];
  }
};
