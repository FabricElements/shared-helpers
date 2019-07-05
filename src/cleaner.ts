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
  collection: string,
  table: string,
  column: string,
}) => {
  if (!filter.collection) {
    console.error("Can't get Collection");
    return;
  }
  return `DELETE
FROM
  \`${filter.table}.collection."${filter.collection}"\`
WHERE
  STRUCT(id,
    updated  ${filter.column ? `,${filter.column}` : ""} ) NOT IN (
  SELECT
    AS STRUCT id,
    updated ${filter.column ? `,${filter.column}` : ""}
  FROM (
    SELECT
      DISTINCT id,
      ${filter.column ? `,${filter.column}` : ""}
      MAX(updated) AS updated
    FROM
      \`${filter.table}.collection."${filter.collection}"\`
    GROUP BY
      id ${filter.column ? `,${filter.column}` : ""} ));`;
};

/**
 * Big Query Clean Database
 * @param filter
 */
export default async (filter: {
  collection: string,
  table: string,
  column: string,
}) => {
  const sqlQuery = query(filter);
  try {
    const [job] = await bigquery.createQueryJob({
      query: sqlQuery,
    });
    const [list] = await job.getQueryResults();
    console.info(`Result delete duplicates ${list}`);
    return list;
  } catch (error) {
    console.warn(`Fail delete duplicates on "${filter.collection}"`, error);
    return [];
  }
};
