"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
const bigquery_1 = require("@google-cloud/bigquery");
const bigquery = new bigquery_1.BigQuery();
/**
 * Create Query for Delete Duplicates.
 * @param {any} filter
 * @return {string}
 */
const query = (filter) => {
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
 */
exports.default = async (filter) => {
    const sqlQuery = query(filter);
    try {
        const [job] = await bigquery.createQueryJob({
            query: sqlQuery,
        });
        const [list] = await job.getQueryResults();
        console.info(`Result delete duplicates ${list}`);
    }
    catch (error) {
        console.warn(`Fail delete duplicates. Dataset: ${filter.dataset}, table: ${filter.table}`, error);
    }
};
//# sourceMappingURL=cleaner.js.map