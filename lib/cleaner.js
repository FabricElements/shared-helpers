"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
exports.default = (filter) => __awaiter(void 0, void 0, void 0, function* () {
    const sqlQuery = query(filter);
    try {
        const [job] = yield bigquery.createQueryJob({
            query: sqlQuery,
        });
        const [list] = yield job.getQueryResults();
        console.info(`Result delete duplicates ${list}`);
    }
    catch (error) {
        console.warn(`Fail delete duplicates. Dataset: ${filter.dataset}, table: ${filter.table}`, error);
        return [];
    }
});
//# sourceMappingURL=cleaner.js.map