/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/FabricElements/shared-helpers/blob/main/LICENSE
 */
import {readFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {describe, expect, it} from 'vitest';
import {FilterHelper} from '../src/filter-helper.js';

const {FilterOperator, FilterOrder, InputDataType, Helper} = FilterHelper;

/**
 * Shape of one frozen conformance vector captured from the Dart encoder.
 */
interface InterfaceVector {
  encoded: string;
  json: string;
  name: string;
}

/**
 * Shape of the frozen conformance fixture.
 */
interface InterfaceVectorFile {
  dartCommit: string;
  dartPackageVersion: string;
  vectors: InterfaceVector[];
}

const fixturePath = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'filter-helper-vectors.json');
const fixture = JSON.parse(readFileSync(fixturePath, 'utf8')) as InterfaceVectorFile;

/**
 * Looks up a frozen conformance vector by name.
 *
 * @param {string} name - The vector name.
 * @returns {string} The base64 encoded payload.
 */
const vector = (name: string): string => {
  const found = fixture.vectors.find((item) => item.name === name);
  if (!found) throw new Error(`missing fixture vector: ${name}`);
  return found.encoded;
};

/**
 * Encodes a JSON value the way the Dart client does, so tests can build payloads.
 *
 * @param {unknown} value - The value to encode.
 * @returns {string} The base64 encoded payload.
 */
const encodePayload = (value: unknown): string => Buffer.from(JSON.stringify(value), 'utf8').toString('base64');

/**
 * Encodes a raw JSON string, for payloads `JSON.stringify` cannot produce.
 *
 * @param {string} json - The raw JSON text.
 * @returns {string} The base64 encoded payload.
 */
const encodeRaw = (json: string): string => Buffer.from(json, 'utf8').toString('base64');

/**
 * Reads the `cause` attached to a thrown error without widening to `any`.
 *
 * @param {unknown} error - The caught value.
 * @returns {Error | undefined} The attached cause, when present.
 */
const causeOf = (error: unknown): Error | undefined => (error as Error & {cause?: Error}).cause;

const allowedFields: Record<string, FilterHelper.InterfaceFilterField> = {
  amount: {column: 'amount_total', paramType: 'FLOAT64'},
  country: {column: 'country_code', paramType: 'STRING'},
  created: {column: 'created_at', paramType: 'TIMESTAMP'},
  name: {column: 'display_name', paramType: 'STRING'},
  status: {column: 'status', paramType: 'STRING'},
};

const options: FilterHelper.InterfaceFilterDecodeOptions = {allowedFields};

// ---------------------------------------------------------------------------
// Dart provenance
// ---------------------------------------------------------------------------

describe('FilterHelper.dartSource', () => {
  it('matches the commit and version the fixture vectors were captured from', () => {
    expect(FilterHelper.dartSource.commit).toBe(fixture.dartCommit);
    expect(FilterHelper.dartSource.version).toBe(fixture.dartPackageVersion);
    expect(FilterHelper.dartSource.package).toBe('fabric_flutter');
  });

  it('keeps every fixture vector consistent with its decoded JSON', () => {
    for (const item of fixture.vectors) {
      expect(Buffer.from(item.encoded, 'base64').toString('utf8')).toBe(item.json);
    }
  });
});

// ---------------------------------------------------------------------------
// Closed enum grammars
// ---------------------------------------------------------------------------

describe('FilterHelper enums', () => {
  it('exposes the Dart FilterOperator members verbatim', () => {
    expect(Object.values(FilterOperator)).toEqual([
      'equal', 'notEqual', 'contains', 'greaterThan', 'greaterThanOrEqual',
      'lessThan', 'lessThanOrEqual', 'between', 'any', 'sort', 'whereIn',
    ]);
  });

  it('exposes the Dart FilterOrder members verbatim', () => {
    expect(Object.values(FilterOrder)).toEqual(['asc', 'desc']);
  });

  it('exposes the Dart InputDataType members verbatim', () => {
    expect(Object.values(InputDataType)).toEqual([
      'date', 'time', 'dateTime', 'timestamp', 'email', 'int', 'double', 'currency',
      'percent', 'text', 'enums', 'dropdown', 'string', 'radio', 'phone', 'secret',
      'url', 'bool',
    ]);
  });
});

// ---------------------------------------------------------------------------
// decode - accepted payloads
// ---------------------------------------------------------------------------

describe('FilterHelper.Helper.decode accepted payloads', () => {
  it('decodes a scalar equality entry', () => {
    expect(Helper.decode(vector('equalString'), options)).toEqual([
      {id: 'status', index: 0, operator: FilterOperator.equal, type: InputDataType.string, value: 'active'},
    ]);
  });

  it('decodes a two-sided range entry', () => {
    expect(Helper.decode(vector('betweenDateTime'), options)).toEqual([
      {
        id: 'created',
        index: 1,
        operator: FilterOperator.between,
        type: InputDataType.dateTime,
        value: ['2024-01-01T00:00:00.000Z', '2024-02-01T00:00:00.000Z'],
      },
    ]);
  });

  it('decodes a list membership entry', () => {
    expect(Helper.decode(vector('whereInStrings'), options)).toEqual([
      {id: 'country', index: 0, operator: FilterOperator.whereIn, type: InputDataType.string, value: ['US', 'MX']},
    ]);
  });

  it('decodes a sort entry addressing its target through value[0]', () => {
    expect(Helper.decode(vector('sortPair'), options)).toEqual([
      {id: 'sort', index: 2, operator: FilterOperator.sort, type: InputDataType.string, value: ['created', FilterOrder.desc]},
    ]);
  });

  it('keeps an `any` entry even though it produces no predicate', () => {
    const decoded = Helper.decode(vector('anyOperator'), options);
    expect(decoded).toHaveLength(1);
    expect(decoded[0].operator).toBe(FilterOperator.any);
  });

  it('defaults a missing type to the Dart constructor default', () => {
    const encoded = encodePayload([{id: 'status', operator: 'equal', value: 'active'}]);
    expect(Helper.decode(encoded, options)[0].type).toBe(InputDataType.string);
  });

  it('returns an empty list for an absent payload', () => {
    expect(Helper.decode(null, options)).toEqual([]);
    expect(Helper.decode(undefined, options)).toEqual([]);
    expect(Helper.decode('', options)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// decode - silently dropped entries
// ---------------------------------------------------------------------------

describe('FilterHelper.Helper.decode dropped entries', () => {
  it.each([
    ['a cleared scalar value', 'clearedNullValue'],
    ['a cleared list value', 'clearedEmptyList'],
    ['a partially filled range', 'partialBetween'],
  ])('drops %s without throwing', (_label, name) => {
    expect(Helper.decode(vector(name), options)).toEqual([]);
  });

  it('drops an entry with no operator, matching the Dart filter rule', () => {
    const encoded = encodePayload([{id: 'status', operator: null, type: 'string', value: 'active', index: 0}]);
    expect(Helper.decode(encoded, options)).toEqual([]);
  });

  it('drops a list whose members are all null', () => {
    const encoded = encodePayload([{id: 'country', operator: 'whereIn', type: 'string', value: [null, null], index: 0}]);
    expect(Helper.decode(encoded, options)).toEqual([]);
  });

  it('drops a sort entry with an incomplete pair', () => {
    const encoded = encodePayload([{id: 'sort', operator: 'sort', type: 'string', value: [null, null], index: 0}]);
    expect(Helper.decode(encoded, options)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// decode - rejected payloads
// ---------------------------------------------------------------------------

describe('FilterHelper.Helper.decode rejected payloads', () => {
  it('rejects a legacy toSQLEncoded payload with no fallback', () => {
    expect(() => Helper.decode(vector('legacySql'), options)).toThrow('Invalid filter payload');
  });

  it('rejects any payload whose root is not an array', () => {
    expect(() => Helper.decode(encodePayload({status: 'active'}), options)).toThrow('Invalid filter payload');
    expect(() => Helper.decode(encodePayload('SELECT 1'), options)).toThrow('Invalid filter payload');
  });

  it.each([
    ['table', {id: 'status', operator: 'equal', value: 'a', table: 'p.d.t'}],
    ['dataset', {id: 'status', operator: 'equal', value: 'a', dataset: 'd'}],
    ['sql', {id: 'status', operator: 'equal', value: 'a', sql: 'DROP TABLE t'}],
  ])('rejects an entry smuggling a %s key', (_label, entry) => {
    expect(() => Helper.decode(encodePayload([entry]), options)).toThrow('Invalid filter payload');
  });

  it('rejects a reserved key used as an entry key or as an id', () => {
    // Written as raw JSON: an object literal would set the prototype instead of
    // creating an own `__proto__` key, and `JSON.stringify` would then drop it.
    const polluting = encodeRaw('[{"__proto__":{"polluted":true},"id":"status","operator":"equal","value":"a"}]');
    expect(() => Helper.decode(polluting, options)).toThrow('Invalid filter payload');
    expect(() => Helper.decode(encodePayload([{id: 'constructor', operator: 'equal', value: 'a'}]), options))
      .toThrow('Invalid filter payload');
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it('rejects an id that is not on the allow-list', () => {
    const encoded = encodePayload([{id: 'secret_column', operator: 'equal', type: 'string', value: 'a', index: 0}]);
    expect(() => Helper.decode(encoded, options)).toThrow('Invalid filter payload');
  });

  it('rejects an operator outside the closed enum', () => {
    const encoded = encodePayload([{id: 'status', operator: 'regexMatch', type: 'string', value: 'a', index: 0}]);
    expect(() => Helper.decode(encoded, options)).toThrow('Invalid filter payload');
  });

  it('rejects a type outside the closed enum', () => {
    const encoded = encodePayload([{id: 'status', operator: 'equal', type: 'sqlInjection', value: 'a', index: 0}]);
    expect(() => Helper.decode(encoded, options)).toThrow('Invalid filter payload');
  });

  it('rejects an operator the field declaration does not permit', () => {
    const narrowed: FilterHelper.InterfaceFilterDecodeOptions = {
      allowedFields: {status: {column: 'status', operators: [FilterOperator.equal], paramType: 'STRING'}},
    };
    expect(Helper.decode(vector('equalString'), narrowed)).toHaveLength(1);
    const encoded = encodePayload([{id: 'status', operator: 'contains', type: 'string', value: 'a', index: 0}]);
    expect(() => Helper.decode(encoded, narrowed)).toThrow('Invalid filter payload');
  });

  it.each([
    ['a range with one bound', [{id: 'created', operator: 'between', value: ['2024-01-01T00:00:00.000']}]],
    ['a range with three bounds', [{id: 'created', operator: 'between', value: ['a', 'b', 'c']}]],
    ['a non-array list membership value', [{id: 'country', operator: 'whereIn', value: 'US'}]],
    ['an array given to a scalar operator', [{id: 'status', operator: 'equal', value: ['a', 'b']}]],
    ['a non-string contains value', [{id: 'name', operator: 'contains', value: 12}]],
    ['an unsupported sort direction', [{id: 'sort', operator: 'sort', value: ['created', 'random']}]],
    ['a sort target outside the allow-list', [{id: 'sort', operator: 'sort', value: ['secret_column', 'asc']}]],
    ['a non-object entry', ['status=active']],
    ['a negative ordering hint', [{id: 'status', operator: 'equal', value: 'a', index: -1}]],
  ])('rejects %s', (_label, payload) => {
    expect(() => Helper.decode(encodePayload(payload), options)).toThrow('Invalid filter payload');
  });

  it('rejects a non-finite number', () => {
    // `JSON.stringify` cannot emit Infinity, but `JSON.parse` produces it from 1e999.
    const overflow = encodeRaw('[{"id":"amount","operator":"greaterThan","value":1e999}]');
    expect(() => Helper.decode(overflow, options)).toThrow('Invalid filter payload');
  });

  it('rejects payloads that exceed the configured bounds', () => {
    const many = Array.from({length: 3}, () => ({id: 'status', operator: 'equal', type: 'string', value: 'a', index: 0}));
    expect(() => Helper.decode(encodePayload(many), {...options, maxEntries: 2})).toThrow('Invalid filter payload');
    expect(() => Helper.decode(vector('equalString'), {...options, maxEncodedLength: 8})).toThrow('Invalid filter payload');
    const longValue = encodePayload([{id: 'status', operator: 'equal', value: 'a'.repeat(20)}]);
    expect(() => Helper.decode(longValue, {...options, maxValueLength: 5})).toThrow('Invalid filter payload');
    const longList = encodePayload([{id: 'country', operator: 'whereIn', value: ['a', 'b', 'c']}]);
    expect(() => Helper.decode(longList, {...options, maxArrayLength: 2})).toThrow('Invalid filter payload');
  });

  it('rejects malformed and non-canonical base64', () => {
    expect(() => Helper.decode('!!!not base64!!!', options)).toThrow('Invalid filter payload');
    expect(() => Helper.decode(`${vector('equalString')}extra`, options)).toThrow('Invalid filter payload');
  });

  it('rejects a non-string payload', () => {
    expect(() => Helper.decode(42 as unknown as string, options)).toThrow('Invalid filter payload');
  });

  it('never echoes the rejected value in the caller-facing message', () => {
    const encoded = encodePayload([{id: 'secret_column', operator: 'equal', value: 'super-secret-value'}]);
    try {
      Helper.decode(encoded, options);
      expect.unreachable('decode should have thrown');
    } catch (error) {
      expect((error as Error).message).toBe('Invalid filter payload');
      expect((error as Error).message).not.toContain('super-secret-value');
      expect(causeOf(error)).toBeInstanceOf(Error);
    }
  });

  it('rejects a missing or invalid field declaration', () => {
    expect(() => Helper.decode(vector('equalString'), {} as FilterHelper.InterfaceFilterDecodeOptions))
      .toThrow('Invalid filter field configuration');
    const badColumn: FilterHelper.InterfaceFilterDecodeOptions = {
      allowedFields: {status: {column: 'status`; DROP TABLE t; --', paramType: 'STRING'}},
    };
    expect(() => Helper.decodeToQueryFragment(vector('equalString'), badColumn))
      .toThrow('Invalid filter field configuration');
  });

  it('ignores inherited keys when the allow-list is a plain object', () => {
    const encoded = encodePayload([{id: 'toString', operator: 'equal', value: 'a'}]);
    expect(() => Helper.decode(encoded, options)).toThrow('Invalid filter payload');
  });
});

// ---------------------------------------------------------------------------
// Query fragment construction
// ---------------------------------------------------------------------------

describe('FilterHelper.Helper.decodeToQueryFragment', () => {
  it('builds a parameterised equality predicate', () => {
    const fragment = Helper.decodeToQueryFragment(vector('equalString'), options);
    expect(fragment.where).toBe('`status` = @f0');
    expect(fragment.params).toEqual({f0: 'active'});
    expect(fragment.types).toEqual({f0: 'STRING'});
    expect(fragment.orderBy).toBe('');
  });

  it('builds a parameterised range predicate', () => {
    const fragment = Helper.decodeToQueryFragment(vector('betweenDateTime'), options);
    expect(fragment.where).toBe('`created_at` >= @f0 AND `created_at` <= @f1');
    expect(fragment.types).toEqual({f0: 'TIMESTAMP', f1: 'TIMESTAMP'});
  });

  it('builds a repeated parameter for list membership', () => {
    const fragment = Helper.decodeToQueryFragment(vector('whereInStrings'), options);
    expect(fragment.where).toBe('`country_code` IN UNNEST(@f0)');
    expect(fragment.params).toEqual({f0: ['US', 'MX']});
    expect(fragment.types).toEqual({f0: ['STRING']});
  });

  it('uses STRPOS so wildcards in user input cannot widen a contains match', () => {
    const fragment = Helper.decodeToQueryFragment(vector('containsText'), options);
    expect(fragment.where).toBe('STRPOS(`display_name`, @f0) > 0');
    expect(fragment.params).toEqual({f0: '100% pure_gold'});
    expect(fragment.where).not.toContain('LIKE');
  });

  it('routes a sort entry to ORDER BY using the declared column', () => {
    const fragment = Helper.decodeToQueryFragment(vector('sortPair'), options);
    expect(fragment.orderBy).toBe('`created_at` DESC');
    expect(fragment.where).toBe('');
  });

  it('emits no predicate for an `any` entry', () => {
    const fragment = Helper.decodeToQueryFragment(vector('anyOperator'), options);
    expect(fragment.where).toBe('');
    expect(fragment.params).toEqual({});
  });

  it('orders predicates by the index hint so output is deterministic', () => {
    const fragment = Helper.decodeToQueryFragment(vector('multiEntry'), options);
    expect(fragment.where).toBe('`amount_total` > @f0 AND `status` = @f1');
    expect(fragment.params).toEqual({f0: 10.5, f1: 'active'});
    expect(fragment.types).toEqual({f0: 'FLOAT64', f1: 'STRING'});
  });

  it('never places a caller value or a table name in the generated SQL', () => {
    const everyField = {allowedFields: {...allowedFields, ...temporalFields}};
    for (const item of fixture.vectors) {
      if (item.name === 'legacySql') continue;
      const fragment = Helper.decodeToQueryFragment(item.encoded, everyField);
      const sql = `${fragment.where} ${fragment.orderBy}`;
      expect(sql).not.toContain('active');
      expect(sql).not.toContain('2024-');
      expect(sql).not.toContain('100%');
      expect(sql).not.toMatch(/\bFROM\b|\bSELECT\b|\bJOIN\b|;/);
      for (const value of Object.values(fragment.params)) {
        if (typeof value === 'string') expect(sql).not.toContain(value);
      }
    }
  });

  it('produces byte-identical output for the same payload', () => {
    const first = Helper.decodeToQueryFragment(vector('multiEntry'), options);
    const second = Helper.decodeToQueryFragment(vector('multiEntry'), options);
    expect(second).toEqual(first);
  });

  it('revalidates hand-built entries passed straight to toQueryFragment', () => {
    const entries = [{
      id: 'secret_column',
      operator: FilterOperator.equal,
      type: InputDataType.string,
      value: 'a',
    }] as FilterHelper.InterfaceFilterData[];
    expect(() => Helper.toQueryFragment(entries, options)).toThrow('Invalid filter payload');
  });
});

// ---------------------------------------------------------------------------
// Serialization round trip
// ---------------------------------------------------------------------------

describe('FilterHelper.Helper serialization', () => {
  it('round-trips decoded entries through encode and decode', () => {
    const decoded = Helper.decode(vector('multiEntry'), options);
    const encoded = Helper.encode(decoded);
    expect(encoded).not.toBeNull();
    expect(Helper.decode(encoded, options)).toEqual(decoded);
  });

  it('serializes entries in the Dart key order', () => {
    const decoded = Helper.decode(vector('equalString'), options);
    expect(Object.keys(Helper.toJSON(decoded)[0])).toEqual(['id', 'type', 'operator', 'value', 'index']);
  });

  it('drops valueless entries on serialization and returns null when nothing remains', () => {
    const entries = [{
      id: 'status',
      operator: FilterOperator.equal,
      type: InputDataType.string,
      value: null,
    }] as unknown as FilterHelper.InterfaceFilterData[];
    expect(Helper.toJSON(entries)).toEqual([]);
    expect(Helper.encode(entries)).toBeNull();
    expect(Helper.encode([])).toBeNull();
  });

  it('accepts already-parsed JSON through fromJSON', () => {
    const parsed = JSON.parse(Buffer.from(vector('equalString'), 'base64').toString('utf8')) as unknown;
    expect(Helper.fromJSON(parsed, options)).toEqual(Helper.decode(vector('equalString'), options));
  });
});

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

describe('FilterHelper.Helper lookups', () => {
  it('finds an active entry by id and returns its value', () => {
    const decoded = Helper.decode(vector('equalString'), options);
    expect(Helper.filterById(decoded, 'status')?.value).toBe('active');
    expect(Helper.valueFromId(decoded, 'status')).toBe('active');
  });

  it('excludes `any` entries, matching the Dart strict lookup', () => {
    const decoded = Helper.decode(vector('anyOperator'), options);
    expect(Helper.filterById(decoded, 'status')).toBeNull();
    expect(Helper.valueFromId(decoded, 'status')).toBeNull();
  });

  it('returns null for an unknown id', () => {
    expect(Helper.valueFromId(Helper.decode(vector('equalString'), options), 'missing')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Dart parity
//
// Mirrors the upstream fabric_flutter suites at commit
// e03ff636333f157e485bff022582c8a267240b9e so both implementations are pinned to
// the same fixtures rather than merely to the same shape:
//
//   test/serialized/filter_data_test.dart  - wire format (the ported contract)
//   test/helper/filter_helper_test.dart    - SQL literal formatting
//
// Each `it` name repeats its Dart `test` name verbatim so a drift in either
// repository is traceable to the other.
// ---------------------------------------------------------------------------

const temporalFields: Record<string, FilterHelper.InterfaceFilterField> = {
  date_field: {column: 'date_field', paramType: 'DATE'},
  name: {column: 'display_name', paramType: 'STRING'},
  range: {column: 'event_date', paramType: 'DATE'},
  seen: {column: 'seen_at', paramType: 'DATETIME'},
  stamp: {column: 'created_at', paramType: 'TIMESTAMP'},
};

const temporalOptions: FilterHelper.InterfaceFilterDecodeOptions = {allowedFields: temporalFields};

describe('Dart parity: FilterOperator', () => {
  it('should contain all expected enum values', () => {
    expect(Object.values(FilterOperator)).toEqual([
      'equal', 'notEqual', 'contains', 'greaterThan', 'greaterThanOrEqual',
      'lessThan', 'lessThanOrEqual', 'between', 'any', 'sort', 'whereIn',
    ]);
  });
});

describe('Dart parity: FilterOrder', () => {
  it('should contain asc and desc values', () => {
    expect(Object.values(FilterOrder)).toEqual(['asc', 'desc']);
  });
});

describe('Dart parity: FilterData.toJson', () => {
  it('should include id, type, operator, and index', () => {
    const [json] = Helper.toJSON(Helper.decode(vector('equalString'), options));
    expect(Object.keys(json)).toEqual(['id', 'type', 'operator', 'value', 'index']);
    expect(json.id).toBe('status');
    expect(json.type).toBe('string');
    expect(json.operator).toBe('equal');
    expect(json.index).toBe(0);
  });

  it('should serialize a date value as ISO 8601 string', () => {
    const [entry] = Helper.decode(vector('equalDate'), temporalOptions);
    expect(typeof entry.value).toBe('string');
    expect((entry.value as string).startsWith('2024-06-15')).toBe(true);
    expect(entry.value).toBe('2024-06-15T00:00:00.000Z');
  });

  it('should serialize a date between range as ISO 8601 string list', () => {
    const [entry] = Helper.decode(vector('betweenDate'), temporalOptions);
    const list = entry.value as string[];
    expect(Array.isArray(list)).toBe(true);
    expect(list[0].startsWith('2024-01-01')).toBe(true);
    expect(list[1].startsWith('2024-12-31')).toBe(true);
  });

  it('should serialize a sort filter as [field, direction] list', () => {
    const [entry] = Helper.decode(vector('sortPair'), options);
    const list = entry.value as string[];
    expect(list[0]).toBe('created');
    expect(list[1]).toBe('desc');
  });

  it('should produce null value for a null sort filter', () => {
    expect(Helper.decode(vector('sortCleared'), options)).toEqual([]);
  });

  it('should exclude label, enums, options, onChange from JSON output', () => {
    const [json] = Helper.toJSON(Helper.decode(vector('equalString'), options));
    for (const key of ['label', 'enums', 'options', 'onChange', 'group']) {
      expect(Object.prototype.hasOwnProperty.call(json, key)).toBe(false);
    }
  });
});

describe('Dart parity: fromJson / toJson round-trip', () => {
  it('should preserve string filter across a round-trip', () => {
    const decoded = Helper.decode(vector('equalString'), options);
    expect(Helper.decode(Helper.encode(decoded), options)).toEqual(decoded);
  });

  it('should preserve date filter value across a round-trip', () => {
    const decoded = Helper.decode(vector('equalDate'), temporalOptions);
    expect(Helper.decode(Helper.encode(decoded), temporalOptions)).toEqual(decoded);
    expect(decoded[0].value).toBe('2024-06-15T00:00:00.000Z');
  });

  it('should preserve null value filter across a round-trip', () => {
    expect(Helper.decode(vector('clearedNullValue'), options)).toEqual([]);
    expect(Helper.encode(Helper.decode(vector('clearedNullValue'), options))).toBeNull();
  });
});

describe('Dart parity: FilterHelper.valueFromType date formatting', () => {
  // The Dart wire format carries a full ISO 8601 timestamp for every temporal
  // type, while the Dart SQL path narrows `InputDataType.date` to `yyyy-MM-dd`
  // after converting to UTC. This port is the SQL side, so it performs that same
  // narrowing at bind time, keyed off the server-declared `paramType`.
  it('should return the value unchanged when it is null', () => {
    // Dart asserts `valueFromType(dataType: date, value: null)` is null. Here the
    // equivalent observable behaviour is that a null-valued entry never reaches a bind.
    const encoded = encodeRaw('[{"id":"date_field","type":"date","operator":"equal","value":null,"index":0}]');
    const fragment = Helper.decodeToQueryFragment(encoded, temporalOptions);
    expect(fragment.where).toBe('');
    expect(fragment.params).toEqual({});
  });

  it('should serialize a date value as a quoted UTC yyyy-MM-dd string', () => {
    // Dart: DateTime.utc(2024, 3, 7, 18, 45) -> '"2024-03-07"'. The quoting belongs to
    // the SQL-literal path that this port deliberately does not reproduce; the date
    // narrowing is the part that carries over.
    const encoded = encodePayload([
      {id: 'date_field', type: 'date', operator: 'equal', value: '2024-03-07T18:45:00.000Z', index: 0},
    ]);
    expect(Helper.decodeToQueryFragment(encoded, temporalOptions).params.f0).toBe('2024-03-07');
  });

  it('should format a date value as a yyyy-MM-dd literal', () => {
    const {params} = Helper.decodeToQueryFragment(vector('equalDate'), temporalOptions);
    expect(params.f0).toBe('2024-06-15');
  });

  it('should truncate the time component, matching the Dart 2024-12-31 assertion', () => {
    const {params} = Helper.decodeToQueryFragment(vector('dateEndOfDay'), temporalOptions);
    expect(params.f0).toBe('2024-12-31');
  });

  it('should narrow both bounds of a date between range', () => {
    const fragment = Helper.decodeToQueryFragment(vector('betweenDate'), temporalOptions);
    expect(fragment.where).toBe('`event_date` >= @f0 AND `event_date` <= @f1');
    expect(fragment.params).toEqual({f0: '2024-01-01', f1: '2024-12-31'});
  });

  it('should convert to UTC before truncating, matching the Dart toUtc() call', () => {
    const encoded = encodePayload([
      {id: 'date_field', type: 'date', operator: 'equal', value: '2024-06-15T23:00:00.000-05:00', index: 0},
    ]);
    expect(Helper.decodeToQueryFragment(encoded, temporalOptions).params.f0).toBe('2024-06-16');
  });

  it('should keep the zone designator for a timestamp parameter', () => {
    const encoded = encodePayload([
      {id: 'stamp', type: 'timestamp', operator: 'equal', value: '2024-06-15T08:30:00.000Z', index: 0},
    ]);
    expect(Helper.decodeToQueryFragment(encoded, temporalOptions).params.f0).toBe('2024-06-15T08:30:00.000Z');
  });

  it('should drop the zone designator for a datetime parameter', () => {
    const encoded = encodePayload([
      {id: 'seen', type: 'dateTime', operator: 'equal', value: '2024-06-15T08:30:00.000Z', index: 0},
    ]);
    expect(Helper.decodeToQueryFragment(encoded, temporalOptions).params.f0).toBe('2024-06-15T08:30:00.000');
  });

  it('should reject a temporal value that is not an ISO 8601 literal', () => {
    const encoded = encodePayload([
      {id: 'date_field', type: 'date', operator: 'equal', value: 'June 15, 2024', index: 0},
    ]);
    expect(() => Helper.decodeToQueryFragment(encoded, temporalOptions)).toThrow('Invalid filter payload');
    try {
      Helper.decodeToQueryFragment(encoded, temporalOptions);
    } catch (error) {
      expect(causeOf(error)?.message).toContain('ISO 8601');
    }
  });
});

describe('Dart parity: encode inclusion rule', () => {
  // The two Dart entry points historically disagreed: `FilterData.toJson` gated on
  // `value != null` while `FilterHelper.encode` gated on `operator != null`. Both sides
  // now apply the conjunction, which is the only rule that keeps encode and decode
  // lossless with respect to one another.
  it('drops an entry that has a value but no operator', () => {
    const entries = [
      {id: 'status', index: 0, operator: null, type: InputDataType.string, value: 'active'},
      {id: 'name', index: 0, operator: FilterOperator.contains, type: InputDataType.string, value: 'ada'},
    ] as unknown as FilterHelper.InterfaceFilterData[];
    expect(Helper.toJSON(entries).map((item) => item.id)).toEqual(['name']);
  });

  it('drops an entry that has an operator but no value', () => {
    const entries = [
      {id: 'status', index: 0, operator: FilterOperator.equal, type: InputDataType.string, value: null},
    ] as unknown as FilterHelper.InterfaceFilterData[];
    expect(Helper.toJSON(entries)).toEqual([]);
    expect(Helper.encode(entries)).toBeNull();
  });

  // The point of the conjunction: every entry `encode` emits survives `decode`, so a
  // payload never silently shrinks on a round-trip.
  it('emits only entries that decode preserves, so the round-trip is lossless', () => {
    const entries = [
      {id: 'status', index: 0, operator: null, type: InputDataType.string, value: 'active'},
      {id: 'country', index: 0, operator: FilterOperator.whereIn, type: InputDataType.string, value: ['US']},
    ] as unknown as FilterHelper.InterfaceFilterData[];
    const decoded = Helper.decode(Helper.encode(entries), options);
    expect(Helper.toJSON(entries)).toHaveLength(1);
    expect(decoded.map((item) => item.id)).toEqual(['country']);
    expect(Helper.decode(Helper.encode(decoded), options)).toEqual(decoded);
  });
});

/**
 * The backend tiles report timelines with consecutive ranges, so whether the upper
 * bound is inclusive decides if a boundary row is counted once or twice.  The bound
 * style is declared per field by the server, never carried in the payload.
 */
describe('FilterHelper range bounds', () => {
  const rangeFields: Record<string, FilterHelper.InterfaceFilterField> = {
    closed: {column: 'created_at', paramType: 'TIMESTAMP'},
    counter: {betweenBounds: 'halfOpen', column: 'hit_count', paramType: 'INT64'},
    tiled: {betweenBounds: 'halfOpen', column: 'created_at', paramType: 'TIMESTAMP'},
  };
  const rangeOptions: FilterHelper.InterfaceFilterDecodeOptions = {allowedFields: rangeFields};

  const range = (id: string, lower: unknown, upper: unknown): string => encodePayload([
    {id, index: 0, operator: 'between', type: 'dateTime', value: [lower, upper]},
  ]);

  it('closes both bounds by default, matching the Dart SQL builder', () => {
    const fragment = Helper.decodeToQueryFragment(range('closed', '2024-01-01T00:00:00.000Z', '2024-02-01T00:00:00.000Z'), rangeOptions);
    expect(fragment.where).toBe('`created_at` >= @f0 AND `created_at` <= @f1');
  });

  it('excludes the upper bound when the field declares half-open bounds', () => {
    const fragment = Helper.decodeToQueryFragment(range('tiled', '2024-01-01T00:00:00.000Z', '2024-02-01T00:00:00.000Z'), rangeOptions);
    expect(fragment.where).toBe('`created_at` >= @f0 AND `created_at` < @f1');
  });

  it('rejects a reversed temporal range', () => {
    let thrown: unknown;
    try {
      Helper.decode(range('closed', '2024-02-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'), rangeOptions);
    } catch (error) {
      thrown = error;
    }
    expect((thrown as Error).message).toBe('Invalid filter payload');
    expect(causeOf(thrown)?.message).toContain('reversed');
  });

  it('compares instants, so an offset cannot make an ordered range look reversed', () => {
    // 2024-01-01T01:00:00+02:00 is 23:00Z on 2023-12-31, earlier than the upper bound,
    // even though it sorts after it as text.
    const fragment = Helper.decodeToQueryFragment(range('closed', '2024-01-01T01:00:00.000+02:00', '2024-01-01T00:00:00.000Z'), rangeOptions);
    expect(fragment.where).toBe('`created_at` >= @f0 AND `created_at` <= @f1');
  });

  it('accepts equal bounds under closed bounds, which select a single point', () => {
    const fragment = Helper.decodeToQueryFragment(range('closed', '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'), rangeOptions);
    expect(fragment.where).toBe('`created_at` >= @f0 AND `created_at` <= @f1');
  });

  it('rejects equal bounds under half-open bounds, which select nothing', () => {
    let thrown: unknown;
    try {
      Helper.decode(range('tiled', '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'), rangeOptions);
    } catch (error) {
      thrown = error;
    }
    expect((thrown as Error).message).toBe('Invalid filter payload');
    expect(causeOf(thrown)?.message).toContain('empty half-open range');
  });

  it('applies the same ordering rules to numeric bounds', () => {
    expect(() => Helper.decode(range('counter', 10, 1), rangeOptions)).toThrow('Invalid filter payload');
    expect(() => Helper.decode(range('counter', 5, 5), rangeOptions)).toThrow('Invalid filter payload');
    expect(Helper.decode(range('counter', 1, 10), rangeOptions)).toHaveLength(1);
  });

  it('leaves bounds it cannot compare unambiguously to the backend', () => {
    const fields: Record<string, FilterHelper.InterfaceFilterField> = {label: {column: 'label', paramType: 'STRING'}};
    expect(Helper.decode(range('label', 'zebra', 'alpha'), {allowedFields: fields})).toHaveLength(1);
  });
});

/**
 * A BigQuery column name cannot contain a period, so a dotted reference such as
 * `sentiment.text` is always a path into a STRUCT rather than a literal column name.
 * Payload ids are opaque lookup keys and have always allowed dots; only the declared
 * column needs to opt in.
 */
describe('FilterHelper struct path columns', () => {
  const dotted = encodePayload([
    {id: 'sentiment.text', index: 0, operator: 'equal', type: 'string', value: 'happy'},
  ]);

  it('accepts a dotted payload id without any opt-in, and preserves it verbatim', () => {
    const fields = {'sentiment.text': {column: 'flat_column', paramType: 'STRING'} as FilterHelper.InterfaceFilterField};
    const decoded = Helper.decode(dotted, {allowedFields: fields});
    expect(decoded[0].id).toBe('sentiment.text');
    expect(Helper.toQueryFragment(decoded, {allowedFields: fields}).where).toBe('`flat_column` = @f0');
  });

  it('quotes each segment separately so BigQuery reads it as struct access', () => {
    const fields = {'sentiment.text': {column: 'sentiment.text', paramType: 'STRING', structPath: true} as FilterHelper.InterfaceFilterField};
    const fragment = Helper.decodeToQueryFragment(dotted, {allowedFields: fields});
    expect(fragment.where).toBe('`sentiment`.`text` = @f0');
    expect(fragment.params).toEqual({f0: 'happy'});
  });

  it('still rejects a dotted column when the field has not opted in', () => {
    const fields = {'sentiment.text': {column: 'sentiment.text', paramType: 'STRING'} as FilterHelper.InterfaceFilterField};
    expect(() => Helper.decodeToQueryFragment(dotted, {allowedFields: fields})).toThrow('Invalid filter field configuration');
  });

  it('applies struct paths to sort targets too', () => {
    const fields = {'sentiment.text': {column: 'sentiment.text', paramType: 'STRING', structPath: true} as FilterHelper.InterfaceFilterField};
    const encoded = encodePayload([
      {id: 'sort', index: 0, operator: 'sort', type: 'string', value: ['sentiment.text', 'desc']},
    ]);
    expect(Helper.decodeToQueryFragment(encoded, {allowedFields: fields}).orderBy).toBe('`sentiment`.`text` DESC');
  });

  it('validates every segment, so an empty or malformed one is rejected', () => {
    for (const column of ['sentiment.', '.text', 'sentiment..text', 'sentiment.te-xt', 'sentiment.1text']) {
      const fields = {'sentiment.text': {column, paramType: 'STRING', structPath: true} as FilterHelper.InterfaceFilterField};
      expect(() => Helper.decodeToQueryFragment(dotted, {allowedFields: fields})).toThrow('Invalid filter field configuration');
    }
  });

  it('rejects a backtick in a segment, so the quoting cannot be escaped', () => {
    const fields = {'sentiment.text': {column: 'sentiment.te`xt', paramType: 'STRING', structPath: true} as FilterHelper.InterfaceFilterField};
    expect(() => Helper.decodeToQueryFragment(dotted, {allowedFields: fields})).toThrow('Invalid filter field configuration');
  });

  it('bounds how deep a declared path may go', () => {
    const fields = {'sentiment.text': {column: 'a.b.c.d.e.f.g.h.i', paramType: 'STRING', structPath: true} as FilterHelper.InterfaceFilterField};
    let thrown: unknown;
    try {
      Helper.decodeToQueryFragment(dotted, {allowedFields: fields});
    } catch (error) {
      thrown = error;
    }
    expect((thrown as Error).message).toBe('Invalid filter field configuration');
    expect(causeOf(thrown)?.message).toContain('struct path depth');
  });

  it('leaves an opted-in column with no dots as a single identifier', () => {
    const fields = {'sentiment.text': {column: 'flat_column', paramType: 'STRING', structPath: true} as FilterHelper.InterfaceFilterField};
    expect(Helper.decodeToQueryFragment(dotted, {allowedFields: fields}).where).toBe('`flat_column` = @f0');
  });
});

/**
 * A field may allow several operators at once. The timestamp column a report filters on
 * is the real case: it accepts an open-ended `greaterThanOrEqual` carrying a single
 * value, and a two-value half-open `between`. Declaring `betweenBounds` must not narrow
 * the field to ranges only, because an encoder that already emits the single-value form
 * would then have its payloads rejected.
 */
describe('FilterHelper multi operator fields', () => {
  const fields: Record<string, FilterHelper.InterfaceFilterField> = {
    created: {
      betweenBounds: 'halfOpen',
      column: 'event_time',
      operators: [FilterHelper.FilterOperator.greaterThanOrEqual, FilterHelper.FilterOperator.between],
      paramType: 'TIMESTAMP',
    },
  };
  const options: FilterHelper.InterfaceFilterDecodeOptions = {allowedFields: fields};

  it('accepts an open-ended greaterThanOrEqual carrying a single value', () => {
    const payload = encodePayload([
      {id: 'created', index: 0, operator: 'greaterThanOrEqual', type: 'dateTime', value: '2024-01-01T00:00:00.000Z'},
    ]);
    const fragment = Helper.decodeToQueryFragment(payload, options);
    expect(fragment.where).toBe('`event_time` >= @f0');
    expect(fragment.params.f0).toBe('2024-01-01T00:00:00.000Z');
  });

  it('accepts a half-open between on the same field', () => {
    const payload = encodePayload([
      {id: 'created', index: 0, operator: 'between', type: 'dateTime', value: ['2024-01-01T00:00:00.000Z', '2024-02-01T00:00:00.000Z']},
    ]);
    expect(Helper.decodeToQueryFragment(payload, options).where).toBe('`event_time` >= @f0 AND `event_time` < @f1');
  });

  it('still refuses an operator the field does not list', () => {
    const payload = encodePayload([
      {id: 'created', index: 0, operator: 'lessThan', type: 'dateTime', value: '2024-01-01T00:00:00.000Z'},
    ]);
    let thrown: unknown;
    try {
      Helper.decode(payload, options);
    } catch (error) {
      thrown = error;
    }
    expect((thrown as Error).message).toBe('Invalid filter payload');
  });

  it('does not apply range validation to the single value form', () => {
    const payload = encodePayload([
      {id: 'created', index: 0, operator: 'greaterThanOrEqual', type: 'dateTime', value: '2024-02-01T00:00:00.000Z'},
    ]);
    expect(Helper.decode(payload, options)).toHaveLength(1);
  });
});
