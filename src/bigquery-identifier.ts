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
 *
 * Each identifier kind gets its own anchored pattern that reflects the
 * authoritative Google Cloud documentation rules:
 *
 * - Dataset: letters, digits, underscores; must start with a letter or
 *   underscore; max 1 024 characters.
 * - Table: Unicode letters, digits, underscores; MAY start with a digit;
 *   max 1 024 UTF-8 bytes.  Hyphens are NOT allowed in an unquoted table name.
 * - Column/field: must start with a letter or underscore; letters, digits,
 *   underscores; max 300 characters.
 *
 * All patterns are anchored (`^…$`) so no character outside the allow-list can
 * appear anywhere in the value, preventing SQL injection via template-literal
 * identifier interpolation and path-segment injection in resource paths such as
 * `projects/…/datasets/…/tables/…`.
 */

/**
 * BigQuery dataset identifier pattern: letters, digits, and underscores only;
 * must begin with a letter or underscore.  This is the legacy
 * `bigQueryIdentifierPattern` retained for backward compatibility — it is also
 * the correct rule for dataset names and column/field names.
 */
export const bigQueryIdentifierPattern = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

/**
 * BigQuery dataset identifier pattern: letters, digits, and underscores only;
 * must start with a letter or underscore; max 1 024 characters.
 */
export const bigQueryDatasetPattern = /^[a-zA-Z_][a-zA-Z0-9_]{0,1023}$/;

/**
 * BigQuery table name pattern: Unicode letters, digits, and underscores; MAY
 * start with a digit; max 1 024 characters.  Hyphens and all other characters
 * that could escape an unquoted identifier or inject a path segment are
 * rejected.
 */
export const bigQueryTablePattern = /^[\p{L}\p{N}_][\p{L}\p{N}_]{0,1023}$/u;

/**
 * BigQuery column/field name pattern: must start with a letter or underscore;
 * letters, digits, and underscores only; max 300 characters.
 */
export const bigQueryColumnPattern = /^[a-zA-Z_][a-zA-Z0-9_]{0,299}$/;

/**
 * Validates a BigQuery dataset identifier.
 *
 * Dataset names must start with a letter or underscore and contain only
 * letters (A-Z, a-z), digits (0-9), and underscores.  Maximum length is
 * 1 024 characters.
 *
 * @param {string} value - The dataset name to validate.
 * @param {string} label - Human-readable label used in the error message.
 * @throws {Error} When the value is empty or does not match the dataset rules.
 */
export const validateBigQueryDataset = (value: string, label: string): void => {
  if (!value || !bigQueryDatasetPattern.test(value)) {
    throw new Error(`Invalid BigQuery identifier for ${label}: "${value}"`);
  }
};

/**
 * Validates a BigQuery table name.
 *
 * Table names may contain Unicode letters, digits (0-9), and underscores and
 * MAY start with a digit.  Hyphens and all other characters that could break
 * an unquoted identifier or inject a resource-path segment are rejected.
 * Maximum length is 1 024 characters.
 *
 * @param {string} value - The table name to validate.
 * @param {string} label - Human-readable label used in the error message.
 * @throws {Error} When the value is empty or does not match the table rules.
 */
export const validateBigQueryTable = (value: string, label: string): void => {
  if (!value || !bigQueryTablePattern.test(value)) {
    throw new Error(`Invalid BigQuery identifier for ${label}: "${value}"`);
  }
};

/**
 * Validates a BigQuery column/field name.
 *
 * Column names must start with a letter or underscore and contain only
 * letters (A-Z, a-z), digits (0-9), and underscores.  Maximum length is
 * 300 characters.
 *
 * @param {string} value - The column name to validate.
 * @param {string} label - Human-readable label used in the error message.
 * @throws {Error} When the value is empty or does not match the column rules.
 */
export const validateBigQueryColumn = (value: string, label: string): void => {
  if (!value || !bigQueryColumnPattern.test(value)) {
    throw new Error(`Invalid BigQuery identifier for ${label}: "${value}"`);
  }
};

/**
 * Validates a single BigQuery identifier (dataset, table, or column name)
 * using the most conservative rule (letter/underscore start, letters/digits/
 * underscores only).
 *
 * This export is retained for backward compatibility.  New call sites should
 * prefer the kind-specific validators: {@link validateBigQueryDataset},
 * {@link validateBigQueryTable}, or {@link validateBigQueryColumn}.
 *
 * @param {string} value - The identifier string to validate.
 * @param {string} label - Human-readable label used in the error message.
 * @throws {Error} When the value is empty or contains disallowed characters.
 */
export const validateBigQueryIdentifier = (value: string, label: string): void => {
  if (!value || !bigQueryIdentifierPattern.test(value)) {
    throw new Error(`Invalid BigQuery identifier for ${label}: "${value}"`);
  }
};

export default validateBigQueryIdentifier;
