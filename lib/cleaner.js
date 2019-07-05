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
 * @param filter
 */
const query = (filter) => {
    if (!filter.collection) {
        console.error("Can't get Collection");
        return;
    }
    return `DELETE
FROM
  \`${filter.table}.collection."${filter.collection}"\`
WHERE
  STRUCT(id,
    updated
    ${filter.column ? `,${filter.column}` : ""} ) NOT IN (
  SELECT
    AS STRUCT id,
    updated
    ${filter.column ? `,${filter.column}` : ""}
  FROM (
    SELECT
      DISTINCT id,
      MAX(updated) AS updated
      ${filter.column ? `,${filter.column}` : ""}
    FROM
      \`${filter.table}.collection."${filter.collection}"\`
    GROUP BY
      id ${filter.column ? `,${filter.column}` : ""} ));`;
};
/**
 * Big Query Clean Database
 * @param filter
 */
exports.default = async (filter) => {
    const sqlQuery = query(filter);
    try {
        const [job] = await bigquery.createQueryJob({
            query: sqlQuery,
        });
        const [list] = await job.getQueryResults();
        console.info(`Result delete duplicates ${list}`);
        return list;
    }
    catch (error) {
        console.warn(`Fail delete duplicates on "${filter.collection}"`, error);
        return [];
    }
};
//# sourceMappingURL=cleaner.js.map