/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import {describe, expect, it} from 'vitest';
import {
  bigQueryColumnPattern,
  bigQueryDatasetPattern,
  bigQueryIdentifierPattern,
  bigQueryTablePattern,
  validateBigQueryColumn,
  validateBigQueryDataset,
  validateBigQueryIdentifier,
  validateBigQueryTable,
} from '../src/bigquery-identifier.js';

// Injection payloads that must be rejected for ALL identifier kinds.
const injectionPayloads = [
  'events`',
  "events'",
  'events"',
  'events table',
  'project.dataset',
  'events/streams/_default',
  '../events',
  'events-1',
  'events; DROP TABLE users',
  'events\nDROP',
  '',
];

describe('validateBigQueryIdentifier (legacy / backward-compat)', () => {
  it.each(['events', 'user_events', '_private', 'Table1', 'a'])(
    'accepts the valid identifier %s', (value) => {
      expect(() => validateBigQueryIdentifier(value, 'dataset')).not.toThrow();
    });

  it.each([
    'events; DROP TABLE users',
    'events`',
    'project.dataset',
    'events-1',
    'events table',
    '1events',
    '../events',
    'events/streams/_default',
  ])('rejects the unsafe identifier %s', (value) => {
    expect(() => validateBigQueryIdentifier(value, 'table')).toThrow('Invalid BigQuery identifier for table');
  });

  it.each(['', null, undefined])('rejects the empty value %s', (value) => {
    expect(() => validateBigQueryIdentifier(value as unknown as string, 'dataset'))
      .toThrow('Invalid BigQuery identifier for dataset');
  });

  it('names the offending label in the error message', () => {
    expect(() => validateBigQueryIdentifier('bad-name', 'timestamp'))
      .toThrow('Invalid BigQuery identifier for timestamp: "bad-name"');
  });

  it('exposes an anchored pattern', () => {
    expect(bigQueryIdentifierPattern.source.startsWith('^')).toBe(true);
    expect(bigQueryIdentifierPattern.source.endsWith('$')).toBe(true);
  });

  it('rejects a leading-digit identifier (legacy validator is strict)', () => {
    expect(() => validateBigQueryIdentifier('0KiM4T7PmHvSp3OUhkBL', 'dataset'))
      .toThrow('Invalid BigQuery identifier for dataset');
  });
});

// ---------------------------------------------------------------------------
// Dataset validation
// ---------------------------------------------------------------------------

describe('validateBigQueryDataset', () => {
  it.each(['myDataset', 'user_events', '_private', 'Dataset1'])(
    'accepts the valid dataset name %s', (value) => {
      expect(() => validateBigQueryDataset(value, 'dataset')).not.toThrow();
    });

  it('rejects a leading-digit dataset name', () => {
    expect(() => validateBigQueryDataset('0KiM4T7PmHvSp3OUhkBL', 'dataset'))
      .toThrow('Invalid BigQuery identifier for dataset');
  });

  it.each(injectionPayloads)('rejects injection payload %j for dataset', (value) => {
    expect(() => validateBigQueryDataset(value, 'dataset'))
      .toThrow('Invalid BigQuery identifier for dataset');
  });

  it('rejects a name that exceeds 1024 characters', () => {
    const overlong = 'a'.repeat(1025);
    expect(() => validateBigQueryDataset(overlong, 'dataset'))
      .toThrow('Invalid BigQuery identifier for dataset');
  });

  it('exposes an anchored pattern', () => {
    expect(bigQueryDatasetPattern.source.startsWith('^')).toBe(true);
    expect(bigQueryDatasetPattern.source.endsWith('$')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Table validation
// ---------------------------------------------------------------------------

describe('validateBigQueryTable', () => {
  it.each(['myTable', 'user_events', '_private', 'Table1'])(
    'accepts the valid table name %s', (value) => {
      expect(() => validateBigQueryTable(value, 'table')).not.toThrow();
    });

  // The key regression fix: leading-digit table names must be accepted.
  it.each(['0KiM4T7PmHvSp3OUhkBL', '4yPw87iVXaGbTmzALDwG', '7R5Plwb1D7C0qNdVozCs', '1events'])(
    'accepts the leading-digit table name %s', (value) => {
      expect(() => validateBigQueryTable(value, 'table')).not.toThrow();
    });

  it.each(injectionPayloads)('rejects injection payload %j for table', (value) => {
    expect(() => validateBigQueryTable(value, 'table'))
      .toThrow('Invalid BigQuery identifier for table');
  });

  it('rejects a name that exceeds 1024 characters', () => {
    const overlong = 'a'.repeat(1025);
    expect(() => validateBigQueryTable(overlong, 'table'))
      .toThrow('Invalid BigQuery identifier for table');
  });

  it('exposes an anchored pattern', () => {
    expect(bigQueryTablePattern.source.startsWith('^')).toBe(true);
    expect(bigQueryTablePattern.source.endsWith('$')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Column validation
// ---------------------------------------------------------------------------

describe('validateBigQueryColumn', () => {
  it.each(['myColumn', 'user_id', '_private', 'Col1'])(
    'accepts the valid column name %s', (value) => {
      expect(() => validateBigQueryColumn(value, 'column')).not.toThrow();
    });

  it('rejects a leading-digit column name', () => {
    expect(() => validateBigQueryColumn('0KiM4T7PmHvSp3OUhkBL', 'column'))
      .toThrow('Invalid BigQuery identifier for column');
  });

  it.each(injectionPayloads)('rejects injection payload %j for column', (value) => {
    expect(() => validateBigQueryColumn(value, 'column'))
      .toThrow('Invalid BigQuery identifier for column');
  });

  it('rejects a name that exceeds 300 characters', () => {
    const overlong = 'a'.repeat(301);
    expect(() => validateBigQueryColumn(overlong, 'column'))
      .toThrow('Invalid BigQuery identifier for column');
  });

  it('exposes an anchored pattern', () => {
    expect(bigQueryColumnPattern.source.startsWith('^')).toBe(true);
    expect(bigQueryColumnPattern.source.endsWith('$')).toBe(true);
  });
});
