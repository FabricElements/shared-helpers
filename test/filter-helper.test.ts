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

/** Every operator, for fixtures whose subject is not the operator allow-list. */
const allOperators: readonly FilterHelper.FilterOperator[] = Object.freeze(
  Object.values(FilterHelper.FilterOperator),
);

const allowedFields: Record<string, FilterHelper.InterfaceFilterField> = {
  amount: {column: 'amount_total', paramType: 'FLOAT64', operators: allOperators},
  country: {column: 'country_code', paramType: 'STRING', operators: allOperators},
  created: {column: 'created_at', paramType: 'TIMESTAMP', operators: allOperators},
  name: {column: 'display_name', paramType: 'STRING', operators: allOperators},
  status: {column: 'status', paramType: 'STRING', operators: allOperators},
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
      allowedFields: {status: {column: 'status`; DROP TABLE t; --', paramType: 'STRING', operators: allOperators}},
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
  date_field: {column: 'date_field', paramType: 'DATE', operators: allOperators},
  name: {column: 'display_name', paramType: 'STRING', operators: allOperators},
  range: {column: 'event_date', paramType: 'DATE', operators: allOperators},
  seen: {column: 'seen_at', paramType: 'DATETIME', operators: allOperators},
  stamp: {column: 'created_at', paramType: 'TIMESTAMP', operators: allOperators},
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
    closed: {column: 'created_at', paramType: 'TIMESTAMP', operators: allOperators},
    counter: {betweenBounds: 'halfOpen', column: 'hit_count', paramType: 'INT64', operators: allOperators},
    tiled: {betweenBounds: 'halfOpen', column: 'created_at', paramType: 'TIMESTAMP', operators: allOperators},
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
    // Both bounds carry the same offset, so text order and instant order agree and this
    // case alone cannot tell the two comparisons apart. The discriminating fixtures are
    // 'compares instants, so an offset cannot make an ordered range look reversed' below
    // and 'orders between bounds as instants rather than as text'; do not normalise their
    // mixed offsets away, or nothing here would fail if the comparison became lexical.
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
    const fields: Record<string, FilterHelper.InterfaceFilterField> = {label: {column: 'label', paramType: 'STRING', operators: allOperators}};
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
    const fields = {'sentiment.text': {column: 'flat_column', paramType: 'STRING', operators: allOperators} as FilterHelper.InterfaceFilterField};
    const decoded = Helper.decode(dotted, {allowedFields: fields});
    expect(decoded[0].id).toBe('sentiment.text');
    expect(Helper.toQueryFragment(decoded, {allowedFields: fields}).where).toBe('`flat_column` = @f0');
  });

  it('quotes each segment separately so BigQuery reads it as struct access', () => {
    const fields = {'sentiment.text': {column: 'sentiment.text', paramType: 'STRING', structPath: true, operators: allOperators} as FilterHelper.InterfaceFilterField};
    const fragment = Helper.decodeToQueryFragment(dotted, {allowedFields: fields});
    expect(fragment.where).toBe('`sentiment`.`text` = @f0');
    expect(fragment.params).toEqual({f0: 'happy'});
  });

  it('still rejects a dotted column when the field has not opted in', () => {
    const fields = {'sentiment.text': {column: 'sentiment.text', paramType: 'STRING', operators: allOperators} as FilterHelper.InterfaceFilterField};
    expect(() => Helper.decodeToQueryFragment(dotted, {allowedFields: fields})).toThrow('Invalid filter field configuration');
  });

  it('applies struct paths to sort targets too', () => {
    const fields = {'sentiment.text': {column: 'sentiment.text', paramType: 'STRING', structPath: true, operators: allOperators} as FilterHelper.InterfaceFilterField};
    const encoded = encodePayload([
      {id: 'sort', index: 0, operator: 'sort', type: 'string', value: ['sentiment.text', 'desc']},
    ]);
    expect(Helper.decodeToQueryFragment(encoded, {allowedFields: fields}).orderBy).toBe('`sentiment`.`text` DESC');
  });

  it('validates every segment, so an empty or malformed one is rejected', () => {
    for (const column of ['sentiment.', '.text', 'sentiment..text', 'sentiment.te-xt', 'sentiment.1text']) {
      const fields = {'sentiment.text': {column, paramType: 'STRING', structPath: true, operators: allOperators} as FilterHelper.InterfaceFilterField};
      expect(() => Helper.decodeToQueryFragment(dotted, {allowedFields: fields})).toThrow('Invalid filter field configuration');
    }
  });

  it('rejects a backtick in a segment, so the quoting cannot be escaped', () => {
    const fields = {'sentiment.text': {column: 'sentiment.te`xt', paramType: 'STRING', structPath: true, operators: allOperators} as FilterHelper.InterfaceFilterField};
    expect(() => Helper.decodeToQueryFragment(dotted, {allowedFields: fields})).toThrow('Invalid filter field configuration');
  });

  it('bounds how deep a declared path may go', () => {
    const fields = {'sentiment.text': {column: 'a.b.c.d.e.f.g.h.i', paramType: 'STRING', structPath: true, operators: allOperators} as FilterHelper.InterfaceFilterField};
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
    const fields = {'sentiment.text': {column: 'flat_column', paramType: 'STRING', structPath: true, operators: allOperators} as FilterHelper.InterfaceFilterField};
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

/**
 * A caller may use `decode` purely as the untrusted-input boundary and then build SQL
 * from its own predicate table. Such a declaration has no column to give, and forcing a
 * placeholder would put an invented or real column name into a config that never needs
 * one.
 */
describe('FilterHelper validate only fields', () => {
  const fields: Record<string, FilterHelper.InterfaceFilterField> = {
    plain: {column: 'plain_column', paramType: 'STRING', operators: allOperators},
    validated: {operators: [FilterHelper.FilterOperator.equal], paramType: 'STRING'},
  };
  const options: FilterHelper.InterfaceFilterDecodeOptions = {allowedFields: fields};
  const payload = encodePayload([{id: 'validated', index: 0, operator: 'equal', type: 'string', value: 'ok'}]);

  it('decodes a field that declares no column', () => {
    expect(Helper.decode(payload, options)).toEqual([
      {id: 'validated', operator: 'equal', type: 'string', value: 'ok', index: 0},
    ]);
  });

  it('still enforces the operator allow-list without a column', () => {
    const refused = encodePayload([{id: 'validated', index: 0, operator: 'contains', type: 'string', value: 'ok'}]);
    let thrown: unknown;
    try {
      Helper.decode(refused, options);
    } catch (error) {
      thrown = error;
    }
    expect((thrown as Error).message).toBe('Invalid filter payload');
  });

  it('refuses to build a fragment for a field that declares no column', () => {
    let thrown: unknown;
    try {
      Helper.decodeToQueryFragment(payload, options);
    } catch (error) {
      thrown = error;
    }
    expect((thrown as Error).message).toBe('Invalid filter field configuration');
    expect(causeOf(thrown)?.message).toContain('required to build a query fragment');
  });

  it('builds a fragment for sibling fields that do declare a column', () => {
    const sibling = encodePayload([{id: 'plain', index: 0, operator: 'equal', type: 'string', value: 'ok'}]);
    expect(Helper.decodeToQueryFragment(sibling, options).where).toBe('`plain_column` = @f0');
  });
});

/**
 * Generated parameter names are part of the fragment contract. A consumer may splice the
 * fragment into a larger template that it then post-processes with textual token
 * substitution over the same `@` sigil BigQuery uses for bind parameters. Such a
 * substitution matches substrings, not whole tokens, so a replacement key that prefixes a
 * generated name would splice a value into the SQL text and silently turn a bound
 * parameter into raw interpolation. Names are therefore `f` followed by digits, derived
 * from position only, never from payload text.
 */
describe('FilterHelper parameter naming contract', () => {
  const payload = encodePayload([
    {id: 'status', index: 0, operator: 'equal', type: 'string', value: 'active'},
    {id: 'country', index: 1, operator: 'equal', type: 'string', value: 'MX'},
    {id: 'name', index: 2, operator: 'contains', type: 'string', value: 'ada'},
    {id: 'amount', index: 3, operator: 'between', type: 'double', value: [1, 2]},
  ]);

  it('names every parameter f followed by digits', () => {
    const {params} = Helper.decodeToQueryFragment(payload, {allowedFields});
    const names = Object.keys(params);
    expect(names.length).toBeGreaterThan(1);
    for (const name of names) expect(name).toMatch(/^f\d+$/);
  });

  it('never derives a parameter name from payload text', () => {
    const {params} = Helper.decodeToQueryFragment(payload, {allowedFields});
    expect(Object.keys(params)).toEqual(['f0', 'f1', 'f2', 'f3', 'f4']);
    expect(Object.values(params)).toEqual(['active', 'MX', 'ada', 1, 2]);
  });

  it('keeps parameter names clear of common substitution prefixes', () => {
    const {params} = Helper.decodeToQueryFragment(payload, {allowedFields});
    for (const name of Object.keys(params)) {
      for (const reserved of ['account', 'filter', 'return', 'order']) {
        expect(name.indexOf(reserved)).toBe(-1);
      }
    }
  });
});

/**
 * Pins where a temporal value is normalised, and where it is not.
 *
 * A consumer that owns its own SQL calls `decode` and never `toQueryFragment`, so it
 * matters which layer rewrites an offset timestamp. `decode` preserves the literal it
 * received, byte for byte, and only the fragment builder converts to the UTC form
 * BigQuery wants. A consumer can therefore assert string identity across `decode`, but
 * must assert instant identity across `toQueryFragment`.
 */
describe('FilterHelper temporal normalisation boundary', () => {
  const offsetValue = '2026-09-18T00:00:00.000-05:00';
  const offsetPayload = encodePayload([
    {id: 'created', type: 'date', operator: 'greaterThanOrEqual', value: offsetValue, index: 0},
  ]);

  it('returns an offset timestamp from decode byte for byte', () => {
    const [entry] = FilterHelper.Helper.decode(offsetPayload, {allowedFields});
    expect(entry.value).toBe(offsetValue);
  });

  it('converts an offset timestamp to UTC when a fragment is built', () => {
    const fragment = FilterHelper.Helper.toQueryFragment(
      FilterHelper.Helper.decode(offsetPayload, {allowedFields}),
      {allowedFields},
    );
    expect(fragment.params.f0).toBe('2026-09-18T05:00:00.000Z');
    expect(fragment.types.f0).toBe('TIMESTAMP');
  });

  it('never narrows a TIMESTAMP field to a calendar date', () => {
    const fragment = FilterHelper.Helper.toQueryFragment(
      FilterHelper.Helper.decode(offsetPayload, {allowedFields}),
      {allowedFields},
    );
    // Narrowing is chosen by the declared paramType alone, never by the value's shape.
    expect(fragment.params.f0).not.toBe('2026-09-18');
    expect(String(fragment.params.f0)).toContain('T');
  });

  it('orders between bounds as instants rather than as text', () => {
    // Lexically the lower bound sorts first, but it is the later instant, so a range
    // that text comparison would accept has to be refused.
    const reversed = encodePayload([
      {
        id: 'created',
        type: 'date',
        operator: 'between',
        value: ['2026-09-18T00:00:00.000-05:00', '2026-09-18T04:00:00.000Z'],
        index: 0,
      },
    ]);
    expect(() => FilterHelper.Helper.decode(reversed, {allowedFields})).toThrow('Invalid filter payload');
  });

  it('leaves an unparseable temporal literal for the caller to reject', () => {
    const malformed = encodePayload([
      {id: 'created', type: 'date', operator: 'equal', value: 'not-a-date', index: 0},
    ]);
    const [entry] = FilterHelper.Helper.decode(malformed, {allowedFields});
    expect(entry.value).toBe('not-a-date');
    expect(() => FilterHelper.Helper.toQueryFragment([entry], {allowedFields})).toThrow('Invalid filter payload');
  });
});

/**
 * Pins that a field permits exactly the operators it names.
 *
 * The operator list carries no implicit default. A consumer that validates with
 * `decode` but emits its own SQL has to be able to refuse an operator it cannot
 * express, because nothing downstream of this module will refuse it for them.
 */
describe('FilterHelper operator allow-list has no implicit default', () => {
  const payloadFor = (operator: string): string => encodePayload([
    {id: 'label', index: 0, operator, type: 'string', value: 'x'},
  ]);

  it('refuses an operator the field does not name', () => {
    const fields: Record<string, FilterHelper.InterfaceFilterField> = {
      label: {column: 'label', operators: [FilterHelper.FilterOperator.equal], paramType: 'STRING'},
    };
    expect(() => FilterHelper.Helper.decode(payloadFor('contains'), {allowedFields: fields}))
      .toThrow('Invalid filter payload');
    expect(FilterHelper.Helper.decode(payloadFor('equal'), {allowedFields: fields})).toHaveLength(1);
  });

  it('accepts nothing when the field names no operators', () => {
    const fields: Record<string, FilterHelper.InterfaceFilterField> = {
      label: {column: 'label', operators: [], paramType: 'STRING'},
    };
    expect(() => FilterHelper.Helper.decode(payloadFor('equal'), {allowedFields: fields}))
      .toThrow('Invalid filter payload');
  });

  it('accepts every operator only when the field says so explicitly', () => {
    const fields: Record<string, FilterHelper.InterfaceFilterField> = {
      label: {column: 'label', operators: allOperators, paramType: 'STRING'},
    };
    expect(FilterHelper.Helper.decode(payloadFor('contains'), {allowedFields: fields})).toHaveLength(1);
  });

  it('reports a missing operator list as a configuration error', () => {
    // A JavaScript caller can omit a required property that TypeScript would demand,
    // so the omission has to surface as a declaration fault rather than a TypeError.
    const fields = {label: {column: 'label', paramType: 'STRING'}} as unknown as Record<string, FilterHelper.InterfaceFilterField>;
    expect(() => FilterHelper.Helper.decode(payloadFor('equal'), {allowedFields: fields}))
      .toThrow('Invalid filter field configuration');
  });

  it('requires a sort target to name the sort operator', () => {
    const sortPayload = encodePayload([
      {id: 'sort', index: 0, operator: 'sort', type: 'string', value: ['label', 'asc']},
    ]);
    const without: Record<string, FilterHelper.InterfaceFilterField> = {
      label: {column: 'label', operators: [FilterHelper.FilterOperator.equal], paramType: 'STRING'},
    };
    expect(() => FilterHelper.Helper.decode(sortPayload, {allowedFields: without}))
      .toThrow('Invalid filter payload');
    const with_: Record<string, FilterHelper.InterfaceFilterField> = {
      label: {column: 'label', operators: [FilterHelper.FilterOperator.sort], paramType: 'STRING'},
    };
    expect(FilterHelper.Helper.decode(sortPayload, {allowedFields: with_})).toHaveLength(1);
  });
});

describe('FilterHelper refuses a sort entry payload-wide', () => {
  // The two existing sort rejection fixtures each send a payload holding only the sort
  // entry, so they pin that an unlisted target throws but cannot show what else goes with
  // it. `decode` is all-or-nothing: one refused entry discards the entries that already
  // parsed, so a consumer whose allow-list declares no sortable field loses filtering
  // rather than ordering. Softening this to drop the offending entry has to stay a
  // deliberate change, not a quiet one.
  const allowedFields: Record<string, FilterHelper.InterfaceFilterField> = {
    direction: {operators: [FilterOperator.equal], paramType: 'STRING'},
  };

  it('discards filters that parsed when a sort target is not allow-listed', () => {
    const mixed = encodePayload([
      {id: 'direction', index: 0, operator: 'equal', type: 'string', value: 'outbound'},
      {id: 'sort', index: 1, operator: 'sort', type: 'string', value: ['total', 'desc']},
    ]);
    expect(() => Helper.decode(mixed, {allowedFields})).toThrow('Invalid filter payload');
  });

  it('keeps the rest of the payload while the sort pair is still incomplete', () => {
    // The state before a reader picks a column. It is dropped rather than refused, which
    // is why the rejection above stays latent until the first sort is actually chosen.
    const pending = encodePayload([
      {id: 'direction', index: 0, operator: 'equal', type: 'string', value: 'outbound'},
      {id: 'sort', index: 1, operator: 'sort', type: 'string', value: [null, null]},
    ]);
    expect(Helper.decode(pending, {allowedFields})).toEqual([
      {id: 'direction', index: 0, operator: FilterOperator.equal, type: InputDataType.string, value: 'outbound'},
    ]);
  });
});

// ---------------------------------------------------------------------------
// Dart parity: literal SQL generation and in-memory JSON helpers
// ---------------------------------------------------------------------------

/**
 * These fields exercise every operator in {@link Helper.toSQL}. `amount` is numeric so
 * `whereIn`/`between` literals stay bare; `name`/`country` are strings so escaping is
 * observable; `created` is a BigQuery `TIMESTAMP` column.
 */
const sqlFields: Record<string, FilterHelper.InterfaceFilterField> = {
  amount: {column: 'amount_total', paramType: 'FLOAT64', operators: allOperators},
  country: {column: 'country_code', paramType: 'STRING', operators: allOperators},
  created: {column: 'created_at', paramType: 'TIMESTAMP', operators: allOperators},
  name: {column: 'display_name', paramType: 'STRING', operators: allOperators},
};
const sqlOptions: FilterHelper.InterfaceFilterDecodeOptions = {allowedFields: sqlFields};

describe('Dart parity: Helper.toSQL', () => {
  it('builds a bare SELECT when there are no active filters', () => {
    expect(Helper.toSQL([], 'my_table', sqlOptions)).toBe('SELECT * FROM `my_table`');
  });

  it('accepts dataset.table and project.dataset.table paths', () => {
    expect(Helper.toSQL([], 'my_dataset.my_table', sqlOptions)).toBe('SELECT * FROM `my_dataset.my_table`');
    expect(Helper.toSQL([], 'my-project.my_dataset.my_table', sqlOptions))
      .toBe('SELECT * FROM `my-project.my_dataset.my_table`');
  });

  it('rejects a table path with an invalid segment instead of interpolating it', () => {
    // Dart's toSQL concatenates `table` into the returned string with no validation at
    // all; this port refuses to do that.
    expect(() => Helper.toSQL([], 'my_table`; DROP TABLE t; --', sqlOptions)).toThrow('Invalid filter field configuration');
    expect(() => Helper.toSQL([], '', sqlOptions)).toThrow('Invalid filter field configuration');
    expect(() => Helper.toSQL([], 'a.b.c.d', sqlOptions)).toThrow('Invalid filter field configuration');
  });

  it('emits a typed TIMESTAMP literal for a BigQuery timestamp column', () => {
    const filters = Helper.decode(encodePayload([
      {id: 'created', index: 0, operator: 'greaterThan', type: 'timestamp', value: '2024-01-01T00:00:00.000Z'},
    ]), sqlOptions);
    expect(Helper.toSQL(filters, 'events', sqlOptions))
      .toBe("SELECT * FROM `events` WHERE `created_at` > TIMESTAMP '2024-01-01T00:00:00.000Z'");
  });

  it('escapes single quotes and backslashes instead of interpolating them raw', () => {
    // Dart's toSQL would splice `O'Brien\` directly into the string, breaking out of
    // the literal. This port must always produce a single well-formed literal.
    const filters = Helper.decode(encodePayload([
      {id: 'name', index: 0, operator: 'equal', type: 'string', value: "O'Brien\\"},
    ]), sqlOptions);
    expect(Helper.toSQL(filters, 'people', sqlOptions))
      .toBe("SELECT * FROM `people` WHERE `display_name` = 'O\\'Brien\\\\'");
  });

  it('renders a between clause with closed bounds by default', () => {
    const filters = Helper.decode(encodePayload([
      {id: 'amount', index: 0, operator: 'between', type: 'double', value: [10, 20]},
    ]), sqlOptions);
    expect(Helper.toSQL(filters, 't', sqlOptions))
      .toBe('SELECT * FROM `t` WHERE `amount_total` >= 10 AND `amount_total` <= 20');
  });

  it('renders a half-open upper bound when the field declares it', () => {
    const halfOpenFields: Record<string, FilterHelper.InterfaceFilterField> = {
      amount: {betweenBounds: 'halfOpen', column: 'amount_total', paramType: 'FLOAT64', operators: allOperators},
    };
    const halfOpenOptions: FilterHelper.InterfaceFilterDecodeOptions = {allowedFields: halfOpenFields};
    const filters = Helper.decode(encodePayload([
      {id: 'amount', index: 0, operator: 'between', type: 'double', value: [10, 20]},
    ]), halfOpenOptions);
    expect(Helper.toSQL(filters, 't', halfOpenOptions))
      .toBe('SELECT * FROM `t` WHERE `amount_total` >= 10 AND `amount_total` < 20');
  });

  it('renders whereIn as a literal IN list, matching membership rather than concatenation', () => {
    const filters = Helper.decode(encodePayload([
      {id: 'country', index: 0, operator: 'whereIn', type: 'string', value: ['US', 'MX']},
    ]), sqlOptions);
    expect(Helper.toSQL(filters, 't', sqlOptions))
      .toBe("SELECT * FROM `t` WHERE `country_code` IN ('US', 'MX')");
  });

  it('renders contains as STRPOS, not a raw LIKE with attacker-controlled wildcards', () => {
    const filters = Helper.decode(encodePayload([
      {id: 'name', index: 0, operator: 'contains', type: 'string', value: 'ada'},
    ]), sqlOptions);
    expect(Helper.toSQL(filters, 't', sqlOptions))
      .toBe("SELECT * FROM `t` WHERE STRPOS(`display_name`, 'ada') > 0");
  });

  it('keeps only the most recently declared sort entry (last-sort-wins)', () => {
    // Dart concatenates every sort entry's text with no separator, which produces
    // malformed SQL once there is more than one. This port keeps a single well-formed
    // ORDER BY by letting the later entry win.
    const filters = Helper.decode(encodePayload([
      {id: 'sort', index: 0, operator: 'sort', type: 'string', value: ['name', 'asc']},
      {id: 'sort', index: 1, operator: 'sort', type: 'string', value: ['created', 'desc']},
    ]), sqlOptions);
    expect(Helper.toSQL(filters, 't', sqlOptions))
      .toBe('SELECT * FROM `t` ORDER BY `created_at` DESC');
  });

  it('appends a validated LIMIT clause', () => {
    expect(Helper.toSQL([], 't', sqlOptions, 25)).toBe('SELECT * FROM `t` LIMIT 25');
  });

  it('rejects a negative or non-integer limit', () => {
    expect(() => Helper.toSQL([], 't', sqlOptions, -1)).toThrow('Invalid filter payload');
    expect(() => Helper.toSQL([], 't', sqlOptions, 1.5)).toThrow('Invalid filter payload');
  });

  it('re-validates filters rather than trusting a hand-built entry list', () => {
    const bogus = [{id: 'missing', index: 0, operator: FilterOperator.equal, type: InputDataType.string, value: 'x'}];
    expect(() => Helper.toSQL(bogus, 't', sqlOptions)).toThrow('Invalid filter payload');
  });
});

describe('Dart parity: Helper.toSQLEncoded', () => {
  it('base64-encodes the exact text Helper.toSQL produces', () => {
    const filters = Helper.decode(encodePayload([
      {id: 'name', index: 0, operator: 'equal', type: 'string', value: 'ada'},
    ]), sqlOptions);
    const sql = Helper.toSQL(filters, 't', sqlOptions);
    expect(Buffer.from(Helper.toSQLEncoded(filters, 't', sqlOptions), 'base64').toString('utf8')).toBe(sql);
  });
});

describe('Dart parity: Helper.toSQL openSearch dialect', () => {
  it('renders notEqual as <> instead of !=, unlike sql/bigQuery', () => {
    const filters = Helper.decode(encodePayload([
      {id: 'name', index: 0, operator: 'notEqual', type: 'string', value: 'ada'},
    ]), sqlOptions);
    expect(Helper.toSQL(filters, 't', sqlOptions, undefined, FilterHelper.SQLQueryType.openSearch))
      .toBe("SELECT * FROM `t` WHERE `display_name` <> 'ada'");
    expect(Helper.toSQL(filters, 't', sqlOptions, undefined, FilterHelper.SQLQueryType.sql))
      .toBe("SELECT * FROM `t` WHERE `display_name` != 'ada'");
  });

  it('renders contains as a scored matchphrase/wildcard expression, not STRPOS', () => {
    const filters = Helper.decode(encodePayload([
      {id: 'name', index: 0, operator: 'contains', type: 'string', value: 'ada'},
    ]), sqlOptions);
    expect(Helper.toSQL(filters, 't', sqlOptions, undefined, FilterHelper.SQLQueryType.openSearch)).toBe(
      'SELECT * FROM `t` WHERE '
      + "(SCORE(matchphrasequery(`display_name`, 'ada'), 100) OR SCORE(WILDCARD_QUERY(`display_name`, '*ada*'), 0.5))",
    );
  });

  it('escapes quotes/backslashes in the contains expression instead of interpolating them raw', () => {
    // Dart splices `filter.value` directly into this expression with no escaping;
    // this port must still produce one well-formed pair of quoted literals.
    const filters = Helper.decode(encodePayload([
      {id: 'name', index: 0, operator: 'contains', type: 'string', value: "O'Brien\\"},
    ]), sqlOptions);
    expect(Helper.toSQL(filters, 't', sqlOptions, undefined, FilterHelper.SQLQueryType.openSearch)).toBe(
      'SELECT * FROM `t` WHERE '
      + "(SCORE(matchphrasequery(`display_name`, 'O\\'Brien\\\\'), 100) "
      + "OR SCORE(WILDCARD_QUERY(`display_name`, '*O\\'Brien\\\\*'), 0.5))",
    );
  });

  it('leaves every dialect-agnostic operator unchanged for openSearch', () => {
    const filters = Helper.decode(encodePayload([
      {id: 'amount', index: 0, operator: 'between', type: 'double', value: [10, 20]},
      {id: 'country', index: 1, operator: 'whereIn', type: 'string', value: ['US', 'MX']},
    ]), sqlOptions);
    expect(Helper.toSQL(filters, 't', sqlOptions, undefined, FilterHelper.SQLQueryType.openSearch)).toBe(
      'SELECT * FROM `t` WHERE `amount_total` >= 10 AND `amount_total` <= 20 '
      + "AND `country_code` IN ('US', 'MX')",
    );
  });

  it('does not apply a typed BigQuery literal prefix, matching sql', () => {
    const filters = Helper.decode(encodePayload([
      {id: 'created', index: 0, operator: 'greaterThan', type: 'timestamp', value: '2024-01-01T00:00:00.000Z'},
    ]), sqlOptions);
    expect(Helper.toSQL(filters, 't', sqlOptions, undefined, FilterHelper.SQLQueryType.openSearch))
      .toBe("SELECT * FROM `t` WHERE `created_at` > '2024-01-01T00:00:00.000Z'");
  });
});

describe('Dart parity: Helper.valueFromType', () => {
  it('returns null for a null or undefined value', () => {
    expect(Helper.valueFromType(null, InputDataType.string)).toBeNull();
    expect(Helper.valueFromType(undefined, InputDataType.string)).toBeNull();
  });

  it('formats a date value as a typed BigQuery DATE literal', () => {
    expect(Helper.valueFromType('2024-03-07T18:45:00.000Z', InputDataType.date)).toBe("DATE '2024-03-07'");
  });

  it('formats a boolean and a number without quoting', () => {
    expect(Helper.valueFromType(true, InputDataType.string)).toBe('TRUE');
    expect(Helper.valueFromType(42, InputDataType.int)).toBe('42');
  });

  it('escapes a plain string value', () => {
    expect(Helper.valueFromType("it's", InputDataType.string)).toBe("'it\\'s'");
  });

  it('rejects a non-string temporal value', () => {
    expect(() => Helper.valueFromType(42 as unknown as string, InputDataType.date)).toThrow('Invalid filter payload');
  });
});

describe('Dart parity: Helper.filterIdsValue', () => {
  it('maps each id to the first value seen for it, including inactive entries', () => {
    const filters = [
      {id: 'status', index: 0, operator: FilterOperator.equal, type: InputDataType.string, value: 'active'},
      {id: 'status', index: 1, operator: FilterOperator.equal, type: InputDataType.string, value: 'closed'},
      {id: 'region', index: 2, operator: FilterOperator.any, type: InputDataType.string, value: 'us'},
    ] as unknown as FilterHelper.InterfaceFilterData[];
    const map = Helper.filterIdsValue(filters);
    expect(map.get('status')).toBe('active');
    expect(map.get('region')).toBe('us');
    expect(map.size).toBe(2);
  });
});

describe('Dart parity: Helper.filter', () => {
  const filters = [
    {id: 'status', index: 0, operator: FilterOperator.equal, type: InputDataType.string, value: 'active'},
    {id: 'region', index: 1, operator: FilterOperator.any, type: InputDataType.string, value: null},
  ] as unknown as FilterHelper.InterfaceFilterData[];

  it('keeps every entry, including any-operator placeholders, by default', () => {
    expect(Helper.filter(filters).map((entry) => entry.id)).toEqual(['status', 'region']);
  });

  it('excludes any-operator entries in strict mode', () => {
    expect(Helper.filter(filters, true).map((entry) => entry.id)).toEqual(['status']);
  });
});

describe('Dart parity: Helper.merge', () => {
  const base = [
    {id: 'status', index: 0, operator: FilterOperator.equal, type: InputDataType.string, value: 'active'},
  ] as unknown as FilterHelper.InterfaceFilterData[];

  it('appends an update whose id is not yet present', () => {
    const merged = Helper.merge(base, [
      {id: 'region', operator: FilterOperator.equal, type: InputDataType.string, value: 'us'},
    ]);
    expect(merged.map((entry) => entry.id)).toEqual(['status', 'region']);
    expect(merged[1].value).toBe('us');
  });

  it('overwrites an existing entry in place', () => {
    const merged = Helper.merge(base, [
      {id: 'status', operator: FilterOperator.equal, type: InputDataType.string, value: 'closed'},
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0].value).toBe('closed');
  });

  it('removes the matching entry when the update has no operator', () => {
    // Adapts Dart's nullable-operator "clear" semantics to this port's non-nullable
    // `operator` field: omitting `operator` is the update-side signal to remove.
    const merged = Helper.merge(base, [{id: 'status'}]);
    expect(merged).toEqual([]);
  });

  it('leaves the original array untouched', () => {
    Helper.merge(base, [{id: 'status'}]);
    expect(base).toHaveLength(1);
  });
});

describe('Dart parity: Helper.formatJSON', () => {
  it('parses declared fields per their InputDataType and leaves other keys alone', () => {
    const filters = [
      {id: 'age', index: 0, operator: FilterOperator.equal, type: InputDataType.int, value: 1},
    ] as unknown as FilterHelper.InterfaceFilterData[];
    const rows = Helper.formatJSON(filters, [{age: '42', name: 'ada'}]);
    expect(rows).toEqual([{age: 42, name: 'ada'}]);
  });

  it('formats each element of an array value element-wise', () => {
    const filters = [
      {id: 'scores', index: 0, operator: FilterOperator.whereIn, type: InputDataType.int, value: []},
    ] as unknown as FilterHelper.InterfaceFilterData[];
    expect(Helper.formatJSON(filters, [{scores: ['1', '2']}])).toEqual([{scores: [1, 2]}]);
  });
});

describe('Dart parity: Helper.filterJSON', () => {
  const rows = [
    {country: 'US', name: 'ada', score: 10},
    {country: 'MX', name: 'ida', score: 5},
    {country: 'US', name: null, score: 7},
  ];

  it('returns rows unchanged when there are no active filters', () => {
    expect(Helper.filterJSON([], rows)).toBe(rows);
  });

  it('keeps only rows matching every active non-sort entry', () => {
    const filters = [
      {id: 'country', index: 0, operator: FilterOperator.equal, type: InputDataType.string, value: 'US'},
    ] as unknown as FilterHelper.InterfaceFilterData[];
    expect(Helper.filterJSON(filters, rows).map((row) => row.name)).toEqual(['ada', null]);
  });

  it('does not count a null-valued filter as a spurious match (Dart bug fix)', () => {
    // Dart's `filterJSON` increments its match counter even on the branch where
    // `filter.value == null || value == null`, so a null-valued filter always
    // "matches" every row without ever comparing anything — it becomes a silent
    // no-op that still counts toward `totalMatches`. This port only counts an entry
    // once it genuinely matched, so a null-valued filter can never be satisfied and
    // correctly filters every row out instead of letting it slip through unchecked.
    const filters = [
      {id: 'country', index: 0, operator: FilterOperator.equal, type: InputDataType.string, value: 'US'},
      {id: 'name', index: 1, operator: FilterOperator.equal, type: InputDataType.string, value: null},
    ] as unknown as FilterHelper.InterfaceFilterData[];
    expect(Helper.filterJSON(filters, rows)).toEqual([]);
  });

  it('treats whereIn as true membership, not a substring check (Dart bug fix)', () => {
    // Dart's whereIn branch does `value.toString().contains(filter.value)`, a substring
    // test, so a filter of `['1']` would spuriously match a row scored `21`. This port
    // must not.
    const scoreRows = [{score: 1}, {score: 21}, {score: 2}];
    const filters = [
      {id: 'score', index: 0, operator: FilterOperator.whereIn, type: InputDataType.int, value: [1]},
    ] as unknown as FilterHelper.InterfaceFilterData[];
    expect(Helper.filterJSON(filters, scoreRows).map((row) => row.score)).toEqual([1]);
  });

  it('sorts by the declared sort target and direction without requiring a matching non-sort entry', () => {
    const filters = [
      {id: 'sort', index: 0, operator: FilterOperator.sort, type: InputDataType.string, value: ['score', FilterOrder.desc]},
    ] as unknown as FilterHelper.InterfaceFilterData[];
    expect(Helper.filterJSON(filters, rows).map((row) => row.score)).toEqual([10, 7, 5]);
  });

  it('filters and sorts together', () => {
    const filters = [
      {id: 'country', index: 0, operator: FilterOperator.equal, type: InputDataType.string, value: 'US'},
      {id: 'sort', index: 1, operator: FilterOperator.sort, type: InputDataType.string, value: ['score', FilterOrder.asc]},
    ] as unknown as FilterHelper.InterfaceFilterData[];
    expect(Helper.filterJSON(filters, rows).map((row) => row.score)).toEqual([7, 10]);
  });
});
