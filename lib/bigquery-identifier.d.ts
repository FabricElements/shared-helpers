/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 *
 * @fileoverview Canonical BigQuery identifier validation for the package.
 * Dataset, table, and column names are interpolated directly into SQL text and
 * into BigQuery resource paths, neither of which can be parameterised, so the
 * only safe control is an anchored allow-list pattern applied before
 * interpolation.  Every module that interpolates an identifier imports from
 * here rather than re-implementing the check, so the rule cannot drift.
 */
/**
 * BigQuery identifier pattern: letters, digits, and underscores only.
 * This matches the permitted characters for dataset names, table names,
 * and column/field names, preventing SQL injection via identifier interpolation.
 */
export declare const bigQueryIdentifierPattern: RegExp;
/**
 * Validates a single BigQuery identifier (dataset, table, or column name).
 *
 * BigQuery identifiers must start with a letter or underscore and contain only
 * letters, digits, and underscores.  Rejects empty strings and any value that
 * contains characters outside that set, preventing SQL injection through
 * template-literal identifier interpolation and segment injection through
 * resource paths such as `projects/…/datasets/…/tables/…`.
 *
 * @param {string} value - The identifier string to validate.
 * @param {string} label - Human-readable label used in the error message.
 * @throws {Error} When the value is empty or contains disallowed characters.
 */
export declare const validateBigQueryIdentifier: (value: string, label: string) => void;
export default validateBigQueryIdentifier;
