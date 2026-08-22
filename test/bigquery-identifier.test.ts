/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import {describe, expect, it} from 'vitest';
import {bigQueryIdentifierPattern, validateBigQueryIdentifier} from '../src/bigquery-identifier.js';

describe('validateBigQueryIdentifier', () => {
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
});
