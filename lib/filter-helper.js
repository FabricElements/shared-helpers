// noinspection JSUnusedGlobalSymbols
/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 *
 * @fileoverview Server-side decoder, validator, and parameterised query-fragment
 * builder for the compact filter payload produced by the `fabric_flutter` Dart
 * `FilterHelper`.
 *
 * The encoded payload is `base64(utf8(JSON.stringify(FilterData[])))` and carries
 * **only declarative filter data** — `{id, type, operator, value, index}`.  It never
 * contains SQL text and never contains a table or dataset name.  The target table is
 * chosen by the server from a separate, explicit parameter that this module has no
 * knowledge of, so a caller cannot redirect a report at another table by tampering
 * with the payload.
 *
 * Everything that reaches generated SQL is server-declared:
 *
 * - The column name comes from {@link FilterHelper.FilterField.column} in the
 *   caller-supplied allow-list, never from the payload.
 * - The comparison operator comes from a frozen lookup table keyed by a closed enum.
 * - Every value is bound as a query parameter (`@f0`, `@f1`, …) and is never
 *   concatenated into SQL text.
 *
 * The payload therefore contributes exactly three tightly constrained things: an `id`
 * used as a **key lookup** into the allow-list, an `operator` validated against a
 * closed enum, and a `value` that only ever becomes a bind parameter.
 *
 * This module also ports the Dart `toSQL`/`toSQLEncoded` literal-SQL builders, but not
 * their implementation: Dart's versions concatenate untrusted values directly into SQL
 * text with no escaping (`select * from \`$table\` where $subQuery`), which is exactly
 * the vulnerability this module otherwise exists to remove.  This port reuses the same
 * decode allow-list (a value only ever reaches `toSQL` after `fromJSON` validation) and
 * escapes every literal it emits — string values are quote-and-backslash escaped,
 * temporal values are narrowed through the same UTC truncation `decodeToQueryFragment`
 * already applies and emitted as typed `DATE`/`DATETIME`/`TIMESTAMP` literals, and the
 * table path is validated segment-by-segment against {@link validateBigQueryProject},
 * {@link validateBigQueryDataset}, and {@link validateBigQueryTable} before it is
 * interpolated.  A payload that base64-decodes to SQL text rather than a JSON array is
 * still rejected outright by `decode`/`fromJSON`, with no fallback.
 *
 * Note: this module is unrelated to `firestore-helper.ts`.  `FirestoreHelper` has its
 * own `where` clause shape with a different operator vocabulary (`'=='`,
 * `'array-contains'`); the two are structurally similar but semantically distinct and
 * must not be adapted to one another.
 *
 * @see https://github.com/FabricElements/fabric_flutter/blob/e03ff636333f157e485bff022582c8a267240b9e/lib/helper/filter_helper.dart
 * @see https://github.com/FabricElements/fabric_flutter/blob/e03ff636333f157e485bff022582c8a267240b9e/lib/serialized/filter_data.dart
 */
import { validateBigQueryColumn, validateBigQueryDataset, validateBigQueryProject, validateBigQueryTable, } from './bigquery-identifier.js';
export var FilterHelper;
(function (FilterHelper) {
    var _a;
    /**
     * Provenance of the Dart implementation this module mirrors.
     *
     * The wire format is a cross-language contract between the Dart encoder in
     * `fabric_flutter` and this TypeScript decoder.  Neither package imports the other,
     * so the only thing keeping them aligned is this pinned reference plus the
     * conformance vectors in `test/fixtures/filter-helper-vectors.json`, which assert the
     * same version and commit.  When the Dart side changes, update both together.
     */
    FilterHelper.dartSource = {
        commit: 'e03ff636333f157e485bff022582c8a267240b9e',
        helper: 'lib/helper/filter_helper.dart',
        model: 'lib/serialized/filter_data.dart',
        package: 'fabric_flutter',
        repository: 'https://github.com/FabricElements/fabric_flutter',
        version: '3.0.1',
    };
    /**
     * Comparison and sorting operations supported by a filter entry.
     *
     * The member names and their serialized values match the Dart `FilterOperator` enum
     * exactly, because Dart's `json_serializable` encodes an enum as its member name.
     * This is a closed grammar: an operator that is not a member of this enum is
     * rejected rather than ignored.
     *
     * Members are declared in the same order as the Dart enum. Dart derives
     * `FilterOperator.index` from declaration order, so keeping the order aligned
     * means the two enums stay interchangeable even if a future payload revision
     * serializes an operator by ordinal instead of by name.
     */
    let FilterOperator;
    (function (FilterOperator) {
        /** Matches values that are exactly equal. */
        FilterOperator["equal"] = "equal";
        /** Matches values that are not equal. */
        FilterOperator["notEqual"] = "notEqual";
        /** Matches string values that contain the provided text. */
        FilterOperator["contains"] = "contains";
        /** Matches values strictly greater than the provided bound. */
        FilterOperator["greaterThan"] = "greaterThan";
        /** Matches values greater than or equal to the provided bound. */
        FilterOperator["greaterThanOrEqual"] = "greaterThanOrEqual";
        /** Matches values strictly less than the provided bound. */
        FilterOperator["lessThan"] = "lessThan";
        /** Matches values less than or equal to the provided bound. */
        FilterOperator["lessThanOrEqual"] = "lessThanOrEqual";
        /** Matches values within a range whose upper bound may be inclusive or exclusive. */
        FilterOperator["between"] = "between";
        /** Matches any value without applying an additional constraint. Emits no predicate. */
        FilterOperator["any"] = "any";
        /** Represents sorting rather than filtering semantics. Contributes to `ORDER BY`. */
        FilterOperator["sort"] = "sort";
        /** Matches values that exist in a provided collection. */
        FilterOperator["whereIn"] = "whereIn";
    })(FilterOperator = FilterHelper.FilterOperator || (FilterHelper.FilterOperator = {}));
    /**
     * Supported sort directions, matching the Dart `FilterOrder` enum.
     */
    let FilterOrder;
    (function (FilterOrder) {
        /** Sorts values in ascending order. */
        FilterOrder["asc"] = "asc";
        /** Sorts values in descending order. */
        FilterOrder["desc"] = "desc";
    })(FilterOrder = FilterHelper.FilterOrder || (FilterHelper.FilterOrder = {}));
    /**
     * Target SQL dialect for literal query generation, matching the Dart `SQLQueryType`
     * enum in full.
     *
     * `openSearch` targets the OpenSearch SQL plugin's query language: mostly the same
     * syntax as `sql`, but `notEqual` renders as `<>` instead of `!=` and `contains`
     * renders as a `SCORE(matchphrasequery(...), 100) OR SCORE(WILDCARD_QUERY(...),
     * 0.5)` relevance expression instead of a substring check, matching the Dart
     * source's dialect split. Unlike the Dart source, which interpolates the raw value
     * into that expression unescaped, this port always escapes the value first (see
     * {@link buildLiteralFragment}).
     */
    let SQLQueryType;
    (function (SQLQueryType) {
        /** Generic SQL literal formatting (single-quoted strings, ISO date/time literals). */
        SQLQueryType["sql"] = "sql";
        /** BigQuery literal formatting (typed `DATE`/`DATETIME`/`TIMESTAMP` literals). */
        SQLQueryType["bigQuery"] = "bigQuery";
        /** OpenSearch SQL plugin literal formatting (`<>` for `notEqual`, scored match/wildcard `contains`). */
        SQLQueryType["openSearch"] = "openSearch";
    })(SQLQueryType = FilterHelper.SQLQueryType || (FilterHelper.SQLQueryType = {}));
    /**
     * Input editor types a filter entry may declare, matching the Dart `InputDataType`
     * enum member for member.
     *
     * Dart's `json_serializable` encodes an enum as its member name, so these serialized
     * values are the exact strings that appear on the wire.  Like {@link FilterOperator}
     * this is a closed grammar: a `type` that is not a member of this enum is rejected.
     * Adding a member to the Dart enum therefore requires adding it here as well.
     *
     * The value is advisory only — it describes how the Dart UI edited the value and
     * carries no authority over binding or query construction.
     */
    let InputDataType;
    (function (InputDataType) {
        /** Edits a calendar date without a time component. */
        InputDataType["date"] = "date";
        /** Edits a time-of-day value without an associated date. */
        InputDataType["time"] = "time";
        /** Edits a full date and time value. */
        InputDataType["dateTime"] = "dateTime";
        /** Edits a timestamp value serialized as a date and time. */
        InputDataType["timestamp"] = "timestamp";
        /** Edits an email address. */
        InputDataType["email"] = "email";
        /** Edits a signed integer value. */
        InputDataType["int"] = "int";
        /** Edits a floating-point number. */
        InputDataType["double"] = "double";
        /** Edits a numeric value representing currency. */
        InputDataType["currency"] = "currency";
        /** Edits a numeric value representing a percentage. */
        InputDataType["percent"] = "percent";
        /** Edits long-form multiline text. */
        InputDataType["text"] = "text";
        /** Selects from an enumerated list. */
        InputDataType["enums"] = "enums";
        /** Selects from a caller-provided option list. */
        InputDataType["dropdown"] = "dropdown";
        /** Edits a short free-form string. */
        InputDataType["string"] = "string";
        /** Selects one option from a radio-button group. */
        InputDataType["radio"] = "radio";
        /** Edits a phone number. */
        InputDataType["phone"] = "phone";
        /** Edits secret text, such as a password or token. */
        InputDataType["secret"] = "secret";
        /** Edits a URL. */
        InputDataType["url"] = "url";
        /** Edits a boolean value. */
        InputDataType["bool"] = "bool";
    })(InputDataType = FilterHelper.InputDataType || (FilterHelper.InputDataType = {}));
    /** Default maximum length of the encoded payload, checked before base64 decoding. */
    const defaultMaxEncodedLength = 8192;
    /** Default maximum number of filter entries accepted in a single payload. */
    const defaultMaxEntries = 50;
    /** Default maximum length of any single string value. */
    const defaultMaxValueLength = 512;
    /** Default maximum number of elements in a `whereIn` list. */
    const defaultMaxArrayLength = 100;
    /** Maximum length accepted for a filter `id`, matching the BigQuery column limit. */
    const maxIdLength = 300;
    /** Maximum accepted value for the `index` ordering hint. */
    const maxIndexValue = 100000;
    /**
     * The complete set of keys a serialized filter entry may contain.
     *
     * This is an allow-list, not a denylist: an entry carrying any other key — including
     * a smuggled `table`, `dataset`, or `sql` key — is rejected rather than stripped.
     */
    const allowedEntryKeys = Object.freeze(['id', 'index', 'operator', 'type', 'value']);
    /**
     * Keys that must never be accepted as an entry key or as a filter `id`, because
     * they can reach `Object.prototype` through a downstream merge or property set.
     */
    const forbiddenKeys = Object.freeze(['__proto__', 'constructor', 'prototype']);
    /** Every valid {@link FilterOperator} value, used for closed-enum membership checks. */
    const filterOperators = Object.freeze(Object.values(FilterOperator));
    /** Every valid {@link FilterOrder} value, used for closed-enum membership checks. */
    const filterOrders = Object.freeze(Object.values(FilterOrder));
    /** Every valid {@link InputDataType} value, used for closed-enum membership checks. */
    const inputDataTypes = Object.freeze(Object.values(InputDataType));
    /**
     * SQL text for each binary comparison operator.
     *
     * The operator text is looked up from this frozen table by a value that has already
     * been validated as a {@link FilterOperator} member, so no payload text can reach the
     * generated SQL.
     */
    const comparisonOperators = Object.freeze({
        [FilterOperator.equal]: '=',
        [FilterOperator.greaterThan]: '>',
        [FilterOperator.greaterThanOrEqual]: '>=',
        [FilterOperator.lessThan]: '<',
        [FilterOperator.lessThanOrEqual]: '<=',
        [FilterOperator.notEqual]: '!=',
    });
    /** SQL text for each sort direction, keyed by a validated {@link FilterOrder} member. */
    const sortDirections = Object.freeze({
        [FilterOrder.asc]: 'ASC',
        [FilterOrder.desc]: 'DESC',
    });
    /**
     * Builds an error that is safe to return to a caller while preserving diagnostic
     * detail for logs.
     *
     * The message a caller sees is always generic.  The specific reason is attached as
     * `cause` so it reaches server logs without being re-serialised into the caller's
     * message, and the detail never echoes an attacker-supplied value.
     *
     * @param {string} message - Generic, caller-safe message.
     * @param {string} detail - Internal reason, recorded as the error's `cause`.
     * @returns {Error} The caller-safe error.
     */
    const buildError = (message, detail) => {
        const error = new Error(message);
        // `Error.cause` is supported by Node.js >= 16.9 but is only typed by the ES2022
        // lib, which this package does not enable, so it is attached with the same
        // attributes the native constructor option would produce.
        Object.defineProperty(error, 'cause', {
            configurable: true,
            enumerable: false,
            value: new Error(detail),
            writable: true,
        });
        return error;
    };
    /**
     * Builds the caller-facing error for a malformed or disallowed payload.
     *
     * @param {string} detail - Internal reason, recorded as the error's `cause`.
     * @returns {Error} An error whose message is always `Invalid filter payload`.
     */
    const invalidPayload = (detail) => buildError('Invalid filter payload', detail);
    /**
     * Builds the error used when the server-side field allow-list is itself invalid.
     *
     * Kept distinct from {@link invalidPayload} so a configuration bug is not mistaken
     * for a hostile request in logs and metrics.
     *
     * @param {string} detail - Internal reason, recorded as the error's `cause`.
     * @returns {Error} An error whose message is always `Invalid filter field configuration`.
     */
    const invalidField = (detail) => buildError('Invalid filter field configuration', detail);
    /**
     * Resolves a field declaration from the allow-list without consulting the prototype
     * chain.
     *
     * @param {ReadonlyMap<string, FilterField> | Readonly<Record<string, FilterField>>} allowedFields - The allow-list.
     * @param {string} id - The payload identifier to resolve.
     * @returns {FilterField | undefined} The declaration, or `undefined` when the id is not allow-listed.
     */
    const resolveField = (allowedFields, id) => {
        if (allowedFields instanceof Map)
            return allowedFields.get(id);
        return Object.prototype.hasOwnProperty.call(allowedFields, id)
            ? allowedFields[id]
            : undefined;
    };
    /**
     * Reports whether a field permits an operator, refusing an unusable declaration.
     *
     * `operators` is a required part of the declaration, but this module is published as
     * compiled JavaScript and a caller without TypeScript can still omit it. Checking it
     * here turns that into a clear configuration error rather than a `TypeError` raised
     * from inside the decoder.
     *
     * @param {FilterField} field - The server-side field declaration.
     * @param {FilterOperator} operator - The operator carried by the payload entry.
     * @returns {boolean} Whether the field accepts the operator.
     * @throws {Error} When the declaration omits its operator list.
     */
    const permitsOperator = (field, operator) => {
        if (!Array.isArray(field.operators))
            throw invalidField('declared field must list the operators it accepts');
        return field.operators.indexOf(operator) !== -1;
    };
    /**
     *
     * @param {unknown} value - The candidate value.
     * @param {number} position - Index of the entry, used only in the error detail.
     * @param {number} maxValueLength - Maximum accepted string length.
     * @returns {FilterScalar} The validated scalar.
     * @throws {Error} When the value is not a finite scalar or exceeds the length bound.
     */
    const validateScalar = (value, position, maxValueLength) => {
        if (typeof value === 'string') {
            if (value.length > maxValueLength)
                throw invalidPayload(`filter entry ${position}: value exceeds the maximum length`);
            return value;
        }
        if (typeof value === 'number') {
            if (!Number.isFinite(value))
                throw invalidPayload(`filter entry ${position}: value is not a finite number`);
            return value;
        }
        if (typeof value === 'boolean')
            return value;
        throw invalidPayload(`filter entry ${position}: value is not a supported scalar`);
    };
    /**
     * Validates a single element of a list-valued filter.
     *
     * Booleans are rejected here because the list operators (`between`, `whereIn`) are
     * only meaningful over ordered or enumerable values.
     *
     * @param {unknown} value - The candidate element.
     * @param {number} position - Index of the entry, used only in the error detail.
     * @param {number} maxValueLength - Maximum accepted string length.
     * @returns {number | string} The validated element.
     * @throws {Error} When the element is not a finite string or number.
     */
    const validateListMember = (value, position, maxValueLength) => {
        const scalar = validateScalar(value, position, maxValueLength);
        if (typeof scalar === 'boolean')
            throw invalidPayload(`filter entry ${position}: list values cannot be boolean`);
        return scalar;
    };
    /**
     * Determines whether a serialized value represents a cleared filter.
     *
     * The Dart encoder emits `null` for an unset value and an empty list for a cleared
     * `between` or `whereIn` filter, and it does not strip those entries before encoding.
     * Both mean "no constraint", so the entry is dropped rather than rejected.
     *
     * @param {unknown} value - The serialized value.
     * @returns {boolean} `true` when the entry carries no constraint.
     */
    const isClearedValue = (value) => value === null || value === undefined || (Array.isArray(value) && value.length === 0);
    /**
     * Matches the ISO 8601 shapes Dart's `DateTime.toIso8601String` can emit.
     *
     * Applied before `Date.parse` because `Date.parse` also accepts loose,
     * implementation-defined strings such as `June 15, 2024`.  Restricting the
     * grammar first keeps the temporal path fail-closed.
     */
    const iso8601Pattern = /^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d{1,6})?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/;
    /**
     * Temporal bind types whose values must be normalised before binding.
     */
    const temporalParamTypes = Object.freeze(['DATE', 'DATETIME', 'TIMESTAMP']);
    /**
     * Rejects a `between` range whose bounds cannot describe a non-empty interval.
     *
     * Only bounds this can compare unambiguously are checked: numeric pairs, and
     * temporal pairs that are ISO 8601 literals, which are compared as instants so that
     * a zone offset cannot make an ordered range look reversed.  Anything else is left
     * to the backend, because guessing a collation here would reject valid queries.
     *
     * A reversed range is always rejected.  Equal bounds are rejected only under
     * `halfOpen` bounds, where `[x, x)` selects nothing; under closed bounds `[x, x]`
     * legitimately selects the single point `x`.
     *
     * @param {(number | string)[]} bounds - The validated two-element range.
     * @param {FilterField} field - The server-side field declaration.
     * @param {number} position - Index of the entry, used only in the error detail.
     * @throws {Error} When the range is reversed, or empty under half-open bounds.
     */
    const assertOrderedRange = (bounds, field, position) => {
        const [lower, upper] = bounds;
        let low;
        let high;
        if (typeof lower === 'number' && typeof upper === 'number') {
            low = lower;
            high = upper;
        }
        else if (temporalParamTypes.indexOf(field.paramType) !== -1
            && typeof lower === 'string' && typeof upper === 'string'
            && iso8601Pattern.test(lower) && iso8601Pattern.test(upper)) {
            low = Date.parse(lower);
            high = Date.parse(upper);
            if (Number.isNaN(low) || Number.isNaN(high))
                return;
        }
        else {
            return;
        }
        if (low > high)
            throw invalidPayload(`filter entry ${position}: between bounds are reversed`);
        if (low === high && field.betweenBounds === 'halfOpen') {
            throw invalidPayload(`filter entry ${position}: between bounds describe an empty half-open range`);
        }
    };
    /**
     * Normalises an ISO 8601 value to the literal form BigQuery accepts for `paramType`.
     *
     * The Dart wire format always carries a full ISO 8601 timestamp, even for
     * `InputDataType.date`, because `FilterData._valueToJson` calls
     * `DateTime.toIso8601String()` for every temporal type.  BigQuery, however,
     * rejects a `DATE` parameter that carries a time component and rejects a
     * `DATETIME` parameter that carries a zone designator, so the SQL side has to
     * narrow the value.  Dart's own SQL path does exactly this in
     * `FilterHelper.valueFromType`, which converts to UTC and then formats
     * `yyyy-MM-dd` for `InputDataType.date`.
     *
     * Conversion to UTC happens before truncation, matching Dart's `toUtc()` call,
     * so an offset timestamp such as `2024-06-15T23:00:00.000-05:00` narrows to
     * `2024-06-16` rather than to its local calendar date.
     *
     * @param {FilterValue} value - The already validated payload value.
     * @param {FilterParamType | [FilterParamType]} paramType - The declared bind type.
     * @returns {FilterValue} The value in BigQuery's canonical literal form.
     * @throws {Error} When a temporal parameter receives an unparseable value.
     */
    const normaliseTemporal = (value, paramType) => {
        const scalarType = Array.isArray(paramType) ? paramType[0] : paramType;
        if (!temporalParamTypes.includes(scalarType))
            return value;
        if (Array.isArray(value)) {
            return value.map((member) => normaliseTemporal(member, scalarType));
        }
        if (typeof value !== 'string')
            return value;
        if (!iso8601Pattern.test(value))
            throw invalidPayload(`value is not a valid ISO 8601 literal for a ${scalarType} parameter`);
        const parsed = Date.parse(value);
        if (Number.isNaN(parsed))
            throw invalidPayload(`value is not a valid ISO 8601 literal for a ${scalarType} parameter`);
        const iso = new Date(parsed).toISOString();
        if (scalarType === 'DATE')
            return iso.slice(0, 10);
        if (scalarType === 'DATETIME')
            return iso.slice(0, 23);
        return iso;
    };
    /**
     * Validates the value of a `sort` entry and resolves its target field.
     *
     * A Dart `sort` entry serializes its value as a `[field, direction]` pair, so the sort
     * target is carried in the value rather than in the entry `id`.  The target is
     * resolved through the same allow-list as any other field, so a sort entry cannot
     * reach a column the server did not declare.
     *
     * @param {unknown} value - The serialized sort value.
     * @param {number} position - Index of the entry, used only in the error detail.
     * @param {FilterDecodeOptions} options - Decode options carrying the allow-list.
     * @returns {[string, FilterOrder] | null} The validated pair, or `null` when the sort is incomplete.
     * @throws {Error} When the pair is malformed, the target is not allow-listed, or the direction is unknown.
     */
    const validateSortValue = (value, position, options) => {
        if (!Array.isArray(value))
            throw invalidPayload(`filter entry ${position}: sort value must be a [field, direction] pair`);
        if (value.length !== 2)
            throw invalidPayload(`filter entry ${position}: sort value must contain exactly two elements`);
        const [target, direction] = value;
        if (target === null || target === undefined || direction === null || direction === undefined)
            return null;
        if (typeof target !== 'string' || !target.length || target.length > maxIdLength) {
            throw invalidPayload(`filter entry ${position}: sort target is not a valid identifier`);
        }
        if (forbiddenKeys.indexOf(target) !== -1)
            throw invalidPayload(`filter entry ${position}: sort target uses a reserved key`);
        const field = resolveField(options.allowedFields, target);
        if (!field)
            throw invalidPayload(`filter entry ${position}: sort target is not an allowed field`);
        if (!permitsOperator(field, FilterOperator.sort)) {
            throw invalidPayload(`filter entry ${position}: sort is not permitted for the requested field`);
        }
        if (typeof direction !== 'string' || filterOrders.indexOf(direction) === -1) {
            throw invalidPayload(`filter entry ${position}: sort direction is not a known order`);
        }
        return [target, direction];
    };
    /**
     * Validates the value of a non-sort entry against its operator.
     *
     * @param {unknown} value - The serialized value.
     * @param {FilterOperator} operator - The already-validated operator.
     * @param {number} position - Index of the entry, used only in the error detail.
     * @param {number} maxValueLength - Maximum accepted string length.
     * @param {number} maxArrayLength - Maximum accepted list length.
     * @returns {FilterValue | null} The validated value, or `null` when the entry carries no usable constraint.
     * @throws {Error} When the value shape does not match the operator.
     */
    const validateOperatorValue = (value, operator, position, maxValueLength, maxArrayLength) => {
        if (operator === FilterOperator.between) {
            if (!Array.isArray(value))
                throw invalidPayload(`filter entry ${position}: between requires a list value`);
            if (value.length !== 2)
                throw invalidPayload(`filter entry ${position}: between requires exactly two bounds`);
            // A partially filled range serializes with a null bound; treat it as cleared
            // rather than inventing a half-open range the Dart side never expressed.
            if (value[0] === null || value[0] === undefined || value[1] === null || value[1] === undefined)
                return null;
            return [
                validateListMember(value[0], position, maxValueLength),
                validateListMember(value[1], position, maxValueLength),
            ];
        }
        if (operator === FilterOperator.whereIn) {
            if (!Array.isArray(value))
                throw invalidPayload(`filter entry ${position}: whereIn requires a list value`);
            if (value.length > maxArrayLength)
                throw invalidPayload(`filter entry ${position}: whereIn list exceeds the maximum length`);
            const members = value
                .filter((member) => member !== null && member !== undefined)
                .map((member) => validateListMember(member, position, maxValueLength));
            return members.length ? members : null;
        }
        if (operator === FilterOperator.contains) {
            if (typeof value !== 'string')
                throw invalidPayload(`filter entry ${position}: contains requires a string value`);
            return validateScalar(value, position, maxValueLength);
        }
        if (Array.isArray(value))
            throw invalidPayload(`filter entry ${position}: operator does not accept a list value`);
        return validateScalar(value, position, maxValueLength);
    };
    /**
     * Validates one raw entry and normalises it into an {@link FilterData}.
     *
     * Entries that carry no constraint are dropped by returning `null`.  This mirrors the
     * Dart encoder, which emits cleared filters instead of removing them, and is not a
     * relaxation: a dropped entry produces no predicate and never reaches SQL.
     *
     * @param {unknown} raw - The raw parsed entry.
     * @param {number} position - Index of the entry within the payload.
     * @param {FilterDecodeOptions} options - Decode options.
     * @returns {FilterData | null} The validated entry, or `null` when it should be dropped.
     * @throws {Error} When the entry is malformed or references a value that is not allow-listed.
     */
    const validateEntry = (raw, position, options) => {
        if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
            throw invalidPayload(`filter entry ${position}: entry is not an object`);
        }
        const entry = raw;
        const keys = Object.keys(entry);
        for (const key of keys) {
            if (forbiddenKeys.indexOf(key) !== -1)
                throw invalidPayload(`filter entry ${position}: entry uses a reserved key`);
            if (allowedEntryKeys.indexOf(key) === -1)
                throw invalidPayload(`filter entry ${position}: entry carries an unknown key`);
        }
        const rawOperator = entry.operator;
        // The Dart encoder drops entries without an operator, so an absent operator carries
        // no semantics. An operator that is present but unknown is a rejected grammar
        // violation, not a cleared filter.
        if (rawOperator === null || rawOperator === undefined)
            return null;
        if (typeof rawOperator !== 'string' || filterOperators.indexOf(rawOperator) === -1) {
            throw invalidPayload(`filter entry ${position}: operator is not a known filter operator`);
        }
        const operator = rawOperator;
        const rawId = entry.id;
        if (typeof rawId !== 'string' || !rawId.length || rawId.length > maxIdLength) {
            throw invalidPayload(`filter entry ${position}: id is not a valid identifier`);
        }
        if (forbiddenKeys.indexOf(rawId) !== -1)
            throw invalidPayload(`filter entry ${position}: id uses a reserved key`);
        // A sort entry addresses its target through `value[0]`; the Dart UI stores the
        // literal id `'sort'`, which is a pseudo-field and is never resolved as a column.
        let field;
        if (operator !== FilterOperator.sort) {
            field = resolveField(options.allowedFields, rawId);
            if (!field)
                throw invalidPayload(`filter entry ${position}: id is not an allowed field`);
            if (!permitsOperator(field, operator)) {
                throw invalidPayload(`filter entry ${position}: operator is not permitted for the requested field`);
            }
        }
        // Advisory only, but still validated against the closed `InputDataType` grammar so
        // an unrecognized value cannot be stored or echoed. Absent means the Dart
        // `FilterData` constructor default.
        const rawType = entry.type;
        let type = InputDataType.string;
        if (rawType !== null && rawType !== undefined) {
            if (typeof rawType !== 'string' || inputDataTypes.indexOf(rawType) === -1) {
                throw invalidPayload(`filter entry ${position}: type is not a supported input type`);
            }
            type = rawType;
        }
        const rawIndex = entry.index;
        let index;
        if (rawIndex !== null && rawIndex !== undefined) {
            if (typeof rawIndex !== 'number' || !Number.isSafeInteger(rawIndex) || rawIndex < 0 || rawIndex > maxIndexValue) {
                throw invalidPayload(`filter entry ${position}: index is not a valid ordering hint`);
            }
            index = rawIndex;
        }
        const rawValue = entry.value;
        if (isClearedValue(rawValue))
            return null;
        const maxValueLength = options.maxValueLength ?? defaultMaxValueLength;
        const maxArrayLength = options.maxArrayLength ?? defaultMaxArrayLength;
        const value = operator === FilterOperator.sort
            ? validateSortValue(rawValue, position, options)
            : validateOperatorValue(rawValue, operator, position, maxValueLength, maxArrayLength);
        if (value === null)
            return null;
        // Checked here rather than at fragment time so an unusable range is refused by the
        // earliest server-side gate, before the caller's own schema or BigQuery see it.
        if (operator === FilterOperator.between && field) {
            assertOrderedRange(value, field, position);
        }
        // Built key by key from validated locals. The parsed payload is never spread, so a
        // `__proto__` or `constructor` key cannot ride along into the result.
        const result = { id: rawId, operator, type, value };
        if (index !== undefined)
            result.index = index;
        return result;
    };
    /**
     * Maximum number of `.` separated segments accepted in a struct path column.
     */
    const maxColumnPathSegments = 8;
    /**
     * Resolves an allow-listed field to the quoted SQL reference for its column.
     *
     * A plain column is emitted as one backticked identifier. A field declaring
     * `structPath` carries a dotted path into a `STRUCT`, which is validated one segment
     * at a time and emitted with each segment quoted separately. BigQuery column names
     * cannot contain a period, so a dotted reference is only ever a path into a struct,
     * never the literal name of a column.
     *
     * @param {FilterField} field - The server-side field declaration.
     * @returns {string} The backtick-quoted SQL reference.
     * @throws {Error} When the declared column is not a valid BigQuery reference.
     */
    const resolveColumn = (field) => {
        // Distinguished from a wrong type so a validate-only declaration that is then used
        // to build SQL reports the actual mistake.
        if (field.column === undefined)
            throw invalidField('declared column is required to build a query fragment');
        if (typeof field.column !== 'string')
            throw invalidField('declared column must be a string');
        // Split only when the declaration opts in, so a stray dot in a field that was meant
        // to name a single column stays an error instead of silently becoming a path.
        const segments = field.structPath === true ? field.column.split('.') : [field.column];
        if (segments.length > maxColumnPathSegments)
            throw invalidField('declared column exceeds the maximum struct path depth');
        for (const segment of segments) {
            try {
                validateBigQueryColumn(segment, 'filter column');
            }
            catch (error) {
                // The underlying validator echoes the offending value; re-throw generically so
                // the detail stays in `cause` and never reaches the caller's message.
                throw invalidField(`declared column failed BigQuery validation: ${error?.message ?? 'unknown error'}`);
            }
        }
        return segments.map((segment) => `\`${segment}\``).join('.');
    };
    /**
     * Orders entries for deterministic fragment generation.
     *
     * Entries are ordered by their `index` hint and tie-broken by their original
     * position, so a payload always produces byte-identical SQL.
     *
     * @param {FilterData[]} entries - The validated entries.
     * @returns {FilterData[]} A new, ordered array.
     */
    const orderEntries = (entries) => entries
        .map((entry, position) => ({ entry, position }))
        .sort((a, b) => ((a.entry.index ?? 0) - (b.entry.index ?? 0)) || (a.position - b.position))
        .map((item) => item.entry);
    /**
     * Decodes, validates, and converts a filter payload in one step.
     *
     * Exposed on {@link Helper} as `decodeToQueryFragment`; kept here so `decode` and
     * `toQueryFragment` share a single validation path.
     *
     * @param {FilterData[]} entries - Already validated entries.
     * @param {FilterDecodeOptions} options - Decode options carrying the allow-list.
     * @returns {FilterQueryFragment} The parameterised fragment.
     * @throws {Error} When a declared column fails BigQuery validation.
     */
    const buildFragment = (entries, options) => {
        const predicates = [];
        const orderTerms = [];
        const params = {};
        const types = {};
        let paramIndex = 0;
        /**
         * Registers a bind parameter and returns its placeholder.
         *
         * @param {FilterValue} value - The value to bind.
         * @param {FilterParamType | [FilterParamType]} paramType - The BigQuery bind type.
         * @returns {string} The generated placeholder, such as `@f0`.
         */
        const bind = (value, paramType) => {
            const name = `f${paramIndex}`;
            paramIndex += 1;
            params[name] = normaliseTemporal(value, paramType);
            types[name] = paramType;
            return `@${name}`;
        };
        for (const entry of orderEntries(entries)) {
            if (entry.operator === FilterOperator.any)
                continue;
            if (entry.operator === FilterOperator.sort) {
                const [target, direction] = entry.value;
                const field = resolveField(options.allowedFields, target);
                if (!field)
                    throw invalidPayload('sort target is not an allowed field');
                orderTerms.push(`${resolveColumn(field)} ${sortDirections[direction]}`);
                continue;
            }
            const field = resolveField(options.allowedFields, entry.id);
            if (!field)
                throw invalidPayload('id is not an allowed field');
            const column = resolveColumn(field);
            if (entry.operator === FilterOperator.between) {
                const [lower, upper] = entry.value;
                // Emitted as two comparisons rather than `BETWEEN` so the upper bound can be
                // exclusive, and so the shape matches the Dart SQL builder, which also emits
                // `>= lower and <= upper`.
                const upperOperator = field.betweenBounds === 'halfOpen' ? '<' : '<=';
                predicates.push(`${column} >= ${bind(lower, field.paramType)} AND ${column} ${upperOperator} ${bind(upper, field.paramType)}`);
                continue;
            }
            if (entry.operator === FilterOperator.whereIn) {
                predicates.push(`${column} IN UNNEST(${bind(entry.value, [field.paramType])})`);
                continue;
            }
            if (entry.operator === FilterOperator.contains) {
                // STRPOS keeps the value fully parameterised with no wildcard semantics, so a
                // `%` or `_` in user input cannot widen the match and no escaping is required.
                predicates.push(`STRPOS(${column}, ${bind(entry.value, field.paramType)}) > 0`);
                continue;
            }
            predicates.push(`${column} ${comparisonOperators[entry.operator]} ${bind(entry.value, field.paramType)}`);
        }
        return {
            orderBy: orderTerms.join(', '),
            params,
            types,
            where: predicates.join(' AND '),
        };
    };
    /**
     * Escapes a string for safe embedding inside a single-quoted SQL literal by
     * backslash-escaping backslashes and single quotes, matching the escape sequences
     * BigQuery's lexical grammar recognises inside quoted string literals.
     *
     * This is only ever applied to values that are about to be wrapped in surrounding
     * single quotes by {@link formatLiteral}; it does not itself add the quotes.
     */
    const escapeSqlLiteral = (value) => value.replace(/\\/g, '\\\\').replace(/'/g, '\\\'');
    /**
     * Formats a single already-validated scalar as literal SQL text.
     *
     * The decision to quote is driven by the value's own JavaScript runtime type, never
     * by the declared `paramType`: a `field.paramType` of `INT64` does not license
     * emitting a string value unquoted, because the payload only declares an advisory
     * shape and never proves it. Only genuine `number`/`boolean` primitives — which
     * cannot themselves carry a quote, backslash, or statement separator — are emitted
     * bare; every string is escaped and quoted, with a typed BigQuery literal prefix
     * (`DATE`, `DATETIME`, `TIMESTAMP`) added when the dialect is BigQuery and the field
     * is temporal.
     */
    const formatLiteral = (value, paramType, sqlQueryType) => {
        if (typeof value === 'boolean')
            return value ? 'TRUE' : 'FALSE';
        if (typeof value === 'number')
            return String(value);
        const escaped = escapeSqlLiteral(value);
        if (sqlQueryType === SQLQueryType.bigQuery) {
            if (paramType === 'DATE')
                return `DATE '${escaped}'`;
            if (paramType === 'DATETIME')
                return `DATETIME '${escaped}'`;
            if (paramType === 'TIMESTAMP')
                return `TIMESTAMP '${escaped}'`;
        }
        return `'${escaped}'`;
    };
    /**
     * Validates a fully-qualified BigQuery table path (`table`, `dataset.table`, or
     * `project.dataset.table`) segment-by-segment against the canonical validators in
     * `bigquery-identifier.ts`, then wraps the whole validated path in one pair of
     * backticks.
     *
     * @throws {Error} When the path does not have 1-3 segments or any segment fails its
     *   corresponding BigQuery identifier rule.
     */
    const validateTablePath = (table) => {
        if (typeof table !== 'string' || !table.length) {
            throw invalidField('table path must be a non-empty string');
        }
        const segments = table.split('.');
        if (segments.length < 1 || segments.length > 3) {
            throw invalidField('table path must have 1 to 3 dot-separated segments');
        }
        try {
            if (segments.length === 1) {
                validateBigQueryTable(segments[0], 'table path table segment');
            }
            else if (segments.length === 2) {
                validateBigQueryDataset(segments[0], 'table path dataset segment');
                validateBigQueryTable(segments[1], 'table path table segment');
            }
            else {
                validateBigQueryProject(segments[0], 'table path project segment');
                validateBigQueryDataset(segments[1], 'table path dataset segment');
                validateBigQueryTable(segments[2], 'table path table segment');
            }
        }
        catch (error) {
            throw invalidField(`table path failed BigQuery validation: ${error?.message ?? 'unknown error'}`);
        }
        return `\`${table}\``;
    };
    /**
     * Resolves the SQL operator text for a binary comparison, applying the one
     * dialect-specific override the Dart `_sqlOperator` table declares: `notEqual`
     * renders as `<>` for `openSearch` and `!=` for every other dialect. Every other
     * comparison operator this table covers is identical across dialects.
     *
     * @param {FilterOperator} operator - The already-validated comparison operator.
     * @param {SQLQueryType} sqlQueryType - The target SQL dialect.
     * @returns {string} The operator's SQL text for the given dialect.
     */
    const comparisonOperatorFor = (operator, sqlQueryType) => {
        if (operator === FilterOperator.notEqual && sqlQueryType === SQLQueryType.openSearch)
            return '<>';
        return comparisonOperators[operator];
    };
    /**
     * Builds the OpenSearch SQL plugin relevance expression for a `contains` filter,
     * matching the Dart `_sqlOperator` `contains`/`openSearch` fragment:
     * `(SCORE(matchphrasequery(id, 'value'), 100) OR SCORE(WILDCARD_QUERY(id, '*value*'), 0.5))`.
     *
     * The Dart source interpolates `value` into this fragment with no escaping at all.
     * This port never does that: `value` is escaped through {@link escapeSqlLiteral}
     * exactly as every other literal in this file is, before it is embedded in either
     * quoted segment. `column` is safe to interpolate directly because it is always a
     * resolved, allow-listed field column, never raw payload text.
     *
     * @param {string} column - The resolved, allow-listed column identifier.
     * @param {FilterValue} value - The raw filter value to match against.
     * @returns {string} The complete `SCORE(...) OR SCORE(...)` predicate text.
     */
    const openSearchContainsFragment = (column, value) => {
        const escaped = escapeSqlLiteral(String(value));
        return `(SCORE(matchphrasequery(${column}, '${escaped}'), 100) OR SCORE(WILDCARD_QUERY(${column}, '*${escaped}*'), 0.5))`;
    };
    /**
     * Builds the literal (non-parameterised) `WHERE`/`ORDER BY` text for {@link
     * Helper.toSQL}. Structurally parallel to {@link buildFragment} — same entry
     * ordering, column resolution, and per-operator dispatch — but emits an escaped,
     * typed literal for every value instead of registering a bind parameter.
     *
     * Sort handling intentionally differs from `buildFragment`: this keeps only the
     * **last** `sort` entry (last-sort-wins) rather than joining every sort entry into a
     * comma-separated `ORDER BY` list. The Dart source this ports concatenates every
     * sort entry's text onto a single string with no separator, which produces malformed
     * SQL (`order by a ascorder by b desc`) the moment a payload carries more than one
     * sort entry; last-sort-wins is the closest well-formed equivalent given a single
     * `ORDER BY` clause can carry only one deterministic outcome from ambiguous input.
     *
     * `contains` and `notEqual` are the only operators whose rendered text depends on
     * `sqlQueryType`, matching the Dart `_sqlOperator`/`toSQL` dialect split: `sql` and
     * `bigQuery` both use the shared `STRPOS(...) > 0`/`!=` rendering, while
     * `openSearch` uses {@link openSearchContainsFragment} and `<>` respectively (see
     * {@link comparisonOperatorFor}).
     */
    const buildLiteralFragment = (entries, options, sqlQueryType) => {
        const predicates = [];
        let orderBy = '';
        for (const entry of orderEntries(entries)) {
            if (entry.operator === FilterOperator.any)
                continue;
            if (entry.operator === FilterOperator.sort) {
                const [target, direction] = entry.value;
                const field = resolveField(options.allowedFields, target);
                if (!field)
                    throw invalidPayload('sort target is not an allowed field');
                orderBy = `${resolveColumn(field)} ${sortDirections[direction]}`;
                continue;
            }
            const field = resolveField(options.allowedFields, entry.id);
            if (!field)
                throw invalidPayload('id is not an allowed field');
            const column = resolveColumn(field);
            const literal = (value) => formatLiteral(normaliseTemporal(value, field.paramType), field.paramType, sqlQueryType);
            if (entry.operator === FilterOperator.between) {
                const [lower, upper] = entry.value;
                const upperOperator = field.betweenBounds === 'halfOpen' ? '<' : '<=';
                predicates.push(`${column} >= ${literal(lower)} AND ${column} ${upperOperator} ${literal(upper)}`);
                continue;
            }
            if (entry.operator === FilterOperator.whereIn) {
                const members = entry.value.map((member) => literal(member));
                predicates.push(`${column} IN (${members.join(', ')})`);
                continue;
            }
            if (entry.operator === FilterOperator.contains) {
                predicates.push(sqlQueryType === SQLQueryType.openSearch
                    ? openSearchContainsFragment(column, entry.value)
                    : `STRPOS(${column}, ${literal(entry.value)}) > 0`);
                continue;
            }
            predicates.push(`${column} ${comparisonOperatorFor(entry.operator, sqlQueryType)} ${literal(entry.value)}`);
        }
        return { orderBy, where: predicates.join(' AND ') };
    };
    /**
     * Converts a raw data-row value to its formatted-for-display equivalent per an
     * `InputDataType`, mirroring the Dart `parseValueByInputDataType` helper.
     *
     * `time` and `enums` have no meaningful server-side equivalent (a `TimeOfDay` widget
     * value and a client-side `EnumData` lookup, respectively) and are passed through
     * unchanged, matching every other type this module does not recognise.
     */
    const parseValueByInputDataType = (value, type) => {
        if (value === null || value === undefined || value === '')
            return null;
        switch (type) {
            case InputDataType.int: {
                const parsed = typeof value === 'number' ? value : parseInt(String(value), 10);
                return Number.isNaN(parsed) ? null : parsed;
            }
            case InputDataType.double:
            case InputDataType.currency:
            case InputDataType.percent: {
                const text = String(value).replace(/\.$/, '');
                const parsed = typeof value === 'number' ? value : parseFloat(text);
                return Number.isNaN(parsed) ? null : parsed;
            }
            case InputDataType.bool: {
                if (typeof value === 'boolean')
                    return value;
                const text = String(value).toLowerCase();
                if (text === 'true')
                    return true;
                if (text === 'false')
                    return false;
                return null;
            }
            case InputDataType.date:
            case InputDataType.dateTime:
            case InputDataType.timestamp: {
                const parsed = Date.parse(String(value));
                return Number.isNaN(parsed) ? null : new Date(parsed).toISOString();
            }
            case InputDataType.phone: {
                const digits = String(value).replace(/[^\d+]/g, '').replace(/\+/g, '');
                return digits ? `+${digits}` : null;
            }
            default:
                return value;
        }
    };
    /**
     * Compares two already-formatted data-row values for sorting/range purposes.
     *
     * ISO 8601 date/time strings compare as instants; other same-typed strings and
     * numbers compare directly; anything else falls back to a stringified comparison so
     * the function always returns a total order instead of throwing.
     */
    const compareValues = (a, b) => {
        if (typeof a === 'string' && typeof b === 'string') {
            if (iso8601Pattern.test(a) && iso8601Pattern.test(b)) {
                const aTime = Date.parse(a);
                const bTime = Date.parse(b);
                if (!Number.isNaN(aTime) && !Number.isNaN(bTime))
                    return aTime - bTime;
            }
            return a.localeCompare(b);
        }
        if (typeof a === 'number' && typeof b === 'number')
            return a - b;
        return String(a).localeCompare(String(b));
    };
    /**
     * Evaluates a single non-sort, non-`any` filter entry against one already-formatted
     * data-row value.
     *
     * `whereIn` deliberately checks true array membership (`some` over `===`/stringified
     * equality), unlike the Dart source this ports, which calls
     * `value.toString().contains(filter.value)` — a substring check against a single
     * value that happens to also be a `List`'s `toString()`, so `whereIn: ['1']` would
     * spuriously match a row value of `'21'`. Membership is the only correct reading of
     * "where in".
     */
    const matchesFilterEntryValue = (rowValue, entry) => {
        switch (entry.operator) {
            case FilterOperator.equal:
                return rowValue === entry.value || String(rowValue) === String(entry.value);
            case FilterOperator.notEqual:
                return !(rowValue === entry.value || String(rowValue) === String(entry.value));
            case FilterOperator.contains:
                return String(rowValue).toLowerCase().includes(String(entry.value).toLowerCase());
            case FilterOperator.greaterThan:
                return compareValues(rowValue, entry.value) > 0;
            case FilterOperator.greaterThanOrEqual:
                return compareValues(rowValue, entry.value) >= 0;
            case FilterOperator.lessThan:
                return compareValues(rowValue, entry.value) < 0;
            case FilterOperator.lessThanOrEqual:
                return compareValues(rowValue, entry.value) <= 0;
            case FilterOperator.between: {
                const [lower, upper] = entry.value;
                return compareValues(rowValue, lower) >= 0 && compareValues(rowValue, upper) <= 0;
            }
            case FilterOperator.whereIn: {
                const list = entry.value;
                return Array.isArray(list) && list.some((member) => member === rowValue || String(member) === String(rowValue));
            }
            default:
                return false;
        }
    };
    /**
     * Decodes, validates, and converts the compact filter payload produced by the Dart
     * `FilterHelper`.
     */
    class Helper {
    }
    _a = Helper;
    /**
     * Validates an already-parsed filter array.
     *
     * Mirrors the Dart `FilterHelper.fromJSON`, with validation added: every entry is
     * checked against the allow-list and the closed operator grammar, and entries that
     * carry no constraint are dropped.
     *
     * @param {unknown} filters - The parsed payload. Must be an array.
     * @param {FilterDecodeOptions} options - Decode options carrying the field allow-list.
     * @returns {FilterData[]} The validated entries, in payload order.
     * @throws {Error} When the payload is not an array, exceeds its bounds, or contains a malformed or disallowed entry.
     */
    Helper.fromJSON = (filters, options) => {
        if (!options || !options.allowedFields)
            throw invalidField('decode options must supply an allowedFields allow-list');
        // The root must be an array. A legacy `toSQLEncoded` payload base64-decodes to raw
        // SQL text rather than a JSON array, so this check is the kill switch that keeps
        // the legacy format from being accepted. There is deliberately no fallback.
        if (!Array.isArray(filters))
            throw invalidPayload('payload root is not an array');
        const maxEntries = options.maxEntries ?? defaultMaxEntries;
        if (filters.length > maxEntries)
            throw invalidPayload('payload exceeds the maximum number of entries');
        const response = [];
        for (let position = 0; position < filters.length; position += 1) {
            const entry = validateEntry(filters[position], position, options);
            if (entry)
                response.push(entry);
        }
        return response;
    };
    /**
     * Decodes a base64 JSON filter payload into validated filter entries.
     *
     * A `null`, `undefined`, or empty input yields an empty list so callers can treat
     * absent filter state and an omitted query parameter uniformly, matching the Dart
     * `FilterHelper.decode`.
     *
     * The encoded string must be canonical, padded, standard-alphabet base64.  When the
     * payload travels in a URL query string it must be percent-encoded, because a `+`
     * decoded as a space produces a non-canonical string that is rejected rather than
     * silently repaired.
     *
     * @param {string | null | undefined} filters - The base64 payload.
     * @param {FilterDecodeOptions} options - Decode options carrying the field allow-list.
     * @returns {FilterData[]} The validated entries.
     * @throws {Error} When the payload is oversized, not canonical base64, not valid JSON, not an array, or contains a malformed or disallowed entry.
     */
    Helper.decode = (filters, options) => {
        if (filters === null || filters === undefined || filters === '')
            return [];
        if (typeof filters !== 'string')
            throw invalidPayload('payload is not a string');
        // Bound the input before spending work on it.
        const maxEncodedLength = options?.maxEncodedLength ?? defaultMaxEncodedLength;
        if (filters.length > maxEncodedLength)
            throw invalidPayload('encoded payload exceeds the maximum length');
        const decoded = Buffer.from(filters, 'base64');
        // Node's base64 decoder silently ignores characters outside the alphabet, so a
        // round-trip comparison is required to reject padding and charset smuggling.
        if (decoded.toString('base64') !== filters)
            throw invalidPayload('encoded payload is not canonical base64');
        let parsed;
        try {
            parsed = JSON.parse(decoded.toString('utf8'));
        }
        catch (error) {
            throw invalidPayload(`payload is not valid JSON: ${error?.message ?? 'unknown error'}`);
        }
        return _a.fromJSON(parsed, options);
    };
    /**
     * Serializes filter entries into JSON-ready maps, dropping inactive entries.
     *
     * An entry is serialized only when it carries both a value and an operator.  Key
     * order matches Dart's `id, type, operator, value, index`.
     *
     * The two Dart entry points historically disagreed here: `FilterData.toJson` gated
     * on `value != null` while `FilterHelper.encode` gated on `operator != null`, so each
     * could emit an entry the other discarded.  Both sides now apply the conjunction,
     * which is the only rule under which `encode` and `decode` are lossless with respect
     * to one another: a null value is never meaningful, and an operator-less entry cannot
     * compile to a predicate, so `decode` would silently drop it and the payload would
     * shrink on the next round-trip.
     *
     * @param {FilterData[]} filters - The entries to serialize.
     * @returns {Record<string, unknown>[]} The serialized entries.
     */
    Helper.toJSON = (filters) => (filters ?? [])
        .filter((entry) => entry &&
        entry.value !== null && entry.value !== undefined &&
        entry.operator !== null && entry.operator !== undefined)
        .map((entry) => {
        const item = { id: entry.id };
        item.type = entry.type ?? InputDataType.string;
        item.operator = entry.operator;
        item.value = entry.value;
        item.index = entry.index ?? 0;
        return item;
    });
    /**
     * Encodes filter entries as a base64 JSON payload.
     *
     * Returns `null` for an empty active filter set so callers can omit the query
     * parameter entirely, matching the Dart `FilterHelper.encode`.
     *
     * This encoder operates on entries that are already JSON-safe, which decoded
     * entries always are.  It deliberately does not reproduce the Dart
     * `FilterData._valueToJson` runtime conversions (`DateTime` to ISO 8601, enum
     * description), because those depend on Flutter-side types that never exist here.
     *
     * @param {FilterData[]} filters - The entries to encode.
     * @returns {string | null} The base64 payload, or `null` when no entry carries a value.
     */
    Helper.encode = (filters) => {
        const serialized = _a.toJSON(filters);
        if (!serialized.length)
            return null;
        return Buffer.from(JSON.stringify(serialized), 'utf8').toString('base64');
    };
    /**
     * Returns the first active entry matching an id.
     *
     * Mirrors the Dart `FilterHelper.filterById`, which looks up in strict mode so
     * placeholder `any` entries do not masquerade as real values.
     *
     * @param {FilterData[]} filters - The entries to search.
     * @param {string} id - The identifier to match.
     * @returns {FilterData | null} The matching entry, or `null` when there is none.
     */
    Helper.filterById = (filters, id) => (filters ?? [])
        .find((entry) => entry && entry.id === id && entry.operator !== FilterOperator.any) ?? null;
    /**
     * Returns the value of the first active entry matching an id.
     *
     * Mirrors the Dart `FilterHelper.valueFromId`.
     *
     * @param {FilterData[]} filters - The entries to search.
     * @param {string} id - The identifier to match.
     * @returns {FilterValue | null} The value, or `null` when there is no active match.
     */
    Helper.valueFromId = (filters, id) => _a.filterById(filters, id)?.value ?? null;
    /**
     * Builds a parameterised query fragment from filter entries.
     *
     * The entries are re-validated against the allow-list before any SQL text is
     * produced, so calling this directly with hand-built entries is as safe as calling
     * it with the output of {@link Helper.decode}.
     *
     * The returned `where` and `orderBy` strings contain only server-declared column
     * names, fixed operator text, and generated placeholders.  No value is ever
     * interpolated, and the fragment carries no table or dataset name — the caller
     * selects the target table from its own explicit parameter.
     *
     * @param {FilterData[]} filters - The entries to convert.
     * @param {FilterDecodeOptions} options - Decode options carrying the field allow-list.
     * @returns {FilterQueryFragment} The parameterised fragment.
     * @throws {Error} When an entry is malformed, references a field that is not allow-listed, or a declared column fails BigQuery validation.
     */
    Helper.toQueryFragment = (filters, options) => {
        const validated = _a.fromJSON(filters ?? [], options);
        return buildFragment(validated, options);
    };
    /**
     * Decodes a base64 filter payload straight into a parameterised query fragment.
     *
     * @param {string | null | undefined} filters - The base64 payload.
     * @param {FilterDecodeOptions} options - Decode options carrying the field allow-list.
     * @returns {FilterQueryFragment} The parameterised fragment.
     * @throws {Error} When the payload is invalid or a declared column fails BigQuery validation.
     */
    Helper.decodeToQueryFragment = (filters, options) => buildFragment(_a.decode(filters, options), options);
    /**
     * Formats a single raw value as literal SQL text for a declared `InputDataType`.
     *
     * Mirrors the Dart `FilterHelper.valueFromType`, but never interpolates a string
     * value unescaped: every string is quote/backslash-escaped by {@link
     * formatLiteral} before being embedded, and temporal values are narrowed to a
     * canonical BigQuery literal via the same ISO-8601 gate {@link
     * Helper.toQueryFragment} uses, rather than being passed through raw.
     *
     * @param {FilterScalar | null | undefined} value - The raw value to format.
     * @param {InputDataType} dataType - The declared editor type for the value.
     * @param {SQLQueryType} [sqlQueryType] - The target SQL dialect. Defaults to `bigQuery`.
     * @returns {string | null} The formatted SQL literal, or `null` when `value` is null/undefined.
     * @throws {Error} When `dataType` is temporal and `value` is not an ISO 8601 string.
     */
    Helper.valueFromType = (value, dataType, sqlQueryType = SQLQueryType.bigQuery) => {
        if (value === null || value === undefined)
            return null;
        if (dataType === InputDataType.date || dataType === InputDataType.dateTime || dataType === InputDataType.timestamp) {
            if (typeof value !== 'string')
                throw invalidPayload('temporal value must be an ISO 8601 string');
            const paramType = dataType === InputDataType.date
                ? 'DATE'
                : dataType === InputDataType.dateTime ? 'DATETIME' : 'TIMESTAMP';
            const normalised = normaliseTemporal(value, paramType);
            return formatLiteral(normalised, paramType, sqlQueryType);
        }
        if (typeof value === 'boolean')
            return formatLiteral(value, 'BOOL', sqlQueryType);
        if (typeof value === 'number')
            return formatLiteral(value, 'FLOAT64', sqlQueryType);
        return formatLiteral(value, 'STRING', sqlQueryType);
    };
    /**
     * Builds literal (non-parameterised) SQL text selecting every column from a
     * validated table.
     *
     * Mirrors the Dart `FilterHelper.toSQL`, but does not port its implementation: the
     * Dart source concatenates `table` and every value directly into the returned
     * string with no escaping at all. This port re-validates `filters` through {@link
     * Helper.fromJSON} exactly as {@link Helper.toQueryFragment} does, validates
     * `table` segment-by-segment against the canonical BigQuery identifier rules
     * before it is interpolated, and escapes/types every emitted literal through
     * {@link formatLiteral}. See {@link buildLiteralFragment} for the last-sort-wins
     * `ORDER BY` deviation from the Dart source's broken multi-sort concatenation.
     *
     * @param {FilterData[]} filters - The entries to convert.
     * @param {string} table - A `table`, `dataset.table`, or `project.dataset.table` path.
     * @param {FilterDecodeOptions} options - Decode options carrying the field allow-list.
     * @param {number} [limit] - An optional non-negative row limit.
     * @param {SQLQueryType} [sqlQueryType] - The target SQL dialect. Defaults to `bigQuery`.
     * @returns {string} The generated `SELECT` statement.
     * @throws {Error} When an entry is malformed, `table` fails BigQuery validation, or `limit` is not a non-negative integer.
     */
    Helper.toSQL = (filters, table, options, limit, sqlQueryType = SQLQueryType.bigQuery) => {
        const validated = _a.fromJSON(filters ?? [], options);
        const quotedTable = validateTablePath(table);
        const { orderBy, where } = buildLiteralFragment(validated, options, sqlQueryType);
        let sql = `SELECT * FROM ${quotedTable}`;
        if (where)
            sql += ` WHERE ${where}`;
        if (orderBy)
            sql += ` ORDER BY ${orderBy}`;
        if (limit !== undefined) {
            if (!Number.isSafeInteger(limit) || limit < 0)
                throw invalidPayload('limit must be a non-negative integer');
            sql += ` LIMIT ${limit}`;
        }
        return sql;
    };
    /**
     * Encodes the output of {@link Helper.toSQL} as `base64(utf8(sql))`.
     *
     * Mirrors the Dart `FilterHelper.toSQLEncoded`. This is plain transport encoding,
     * not a security boundary: the safety of the generated SQL text comes entirely
     * from {@link Helper.toSQL}'s validation and escaping.
     *
     * @param {FilterData[]} filters - The entries to convert.
     * @param {string} table - A `table`, `dataset.table`, or `project.dataset.table` path.
     * @param {FilterDecodeOptions} options - Decode options carrying the field allow-list.
     * @param {number} [limit] - An optional non-negative row limit.
     * @param {SQLQueryType} [sqlQueryType] - The target SQL dialect. Defaults to `bigQuery`.
     * @returns {string} The base64-encoded UTF-8 SQL text.
     * @throws {Error} Under the same conditions as {@link Helper.toSQL}.
     */
    Helper.toSQLEncoded = (filters, table, options, limit, sqlQueryType = SQLQueryType.bigQuery) => Buffer.from(_a.toSQL(filters, table, options, limit, sqlQueryType), 'utf8').toString('base64');
    /**
     * Builds a map of each entry's first-seen value keyed by id.
     *
     * Mirrors the Dart `FilterHelper.filterIdsValue`: it is a direct, unfiltered
     * lookup (unlike {@link Helper.filterById}/{@link Helper.valueFromId}, it does not
     * exclude `any`-operator entries), intended for callers that need a quick id →
     * value map for every entry present, regardless of operator.
     *
     * @param {FilterData[]} filters - The entries to index.
     * @returns {Map<string, FilterValue>} A map of id to the first value seen for that id.
     */
    Helper.filterIdsValue = (filters) => {
        const map = new Map();
        for (const entry of filters ?? []) {
            if (entry && !map.has(entry.id))
                map.set(entry.id, entry.value);
        }
        return map;
    };
    /**
     * Returns only the entries that represent an active constraint.
     *
     * Mirrors the Dart `FilterHelper.filter`. Every entry in this port already has a
     * non-null `operator`, so without `strict` this returns entries unchanged; with
     * `strict: true` it additionally excludes `any`-operator entries, which
     * contribute no predicate.
     *
     * @param {FilterData[]} filters - The entries to filter.
     * @param {boolean} [strict] - When true, also excludes `any`-operator entries.
     * @returns {FilterData[]} The active entries.
     */
    Helper.filter = (filters, strict = false) => (filters ?? [])
        .filter((entry) => entry && entry.operator !== null && entry.operator !== undefined
        && (!strict || entry.operator !== FilterOperator.any));
    /**
     * Applies a set of merge entries onto an existing filter list.
     *
     * Mirrors the Dart `FilterHelper.merge`, adapted for the non-nullable
     * `FilterData.operator` in this port: see {@link FilterMergeEntry}. An
     * update whose id is not yet present is appended (assigned the next `index` when
     * none is supplied); an update matching an existing id overwrites that entry's
     * `operator`/`type`/`value`/`index` in place; an update with no `operator`
     * removes the matching entry instead of leaving an unrepresentable "cleared"
     * state.
     *
     * @param {FilterData[]} filters - The existing entries.
     * @param {FilterMergeEntry[]} updates - The entries to merge in.
     * @returns {FilterData[]} A new array with the updates applied.
     */
    Helper.merge = (filters, updates) => {
        const base = (filters ?? []).map((entry) => ({ ...entry }));
        let nextIndex = base.reduce((max, entry) => Math.max(max, entry.index ?? 0), 0) + 1;
        for (const update of updates ?? []) {
            if (!update || typeof update.id !== 'string')
                continue;
            const position = base.findIndex((entry) => entry.id === update.id);
            if (update.operator === null || update.operator === undefined) {
                if (position !== -1)
                    base.splice(position, 1);
                continue;
            }
            if (position === -1) {
                const index = update.index ?? nextIndex;
                base.push({
                    id: update.id,
                    index,
                    operator: update.operator,
                    type: update.type,
                    value: update.value,
                });
                nextIndex = index + 1;
            }
            else {
                const current = base[position];
                base[position] = {
                    ...current,
                    index: update.index ?? current.index,
                    operator: update.operator,
                    type: update.type ?? current.type,
                    value: update.value ?? current.value,
                };
            }
        }
        return base;
    };
    /**
     * Parses every declared filter field's value on every row per its `InputDataType`.
     *
     * Mirrors the Dart `FilterHelper.formatJSON`. Only ids that appear both in
     * `filters` and as an own-enumerable key of a row are reformatted; every other row
     * key is passed through unchanged.
     *
     * @param {FilterData[]} filters - The entries declaring each id's `InputDataType`.
     * @param {Record<string, unknown>[]} data - The rows to reformat.
     * @returns {Record<string, unknown>[]} A new array of rows with declared fields reformatted.
     */
    Helper.formatJSON = (filters, data) => {
        const typeById = new Map();
        for (const entry of filters ?? []) {
            if (entry)
                typeById.set(entry.id, entry.type ?? InputDataType.string);
        }
        return (data ?? []).map((row) => {
            const formatted = { ...row };
            for (const [id, type] of typeById) {
                if (!Object.prototype.hasOwnProperty.call(row, id))
                    continue;
                const raw = row[id];
                formatted[id] = Array.isArray(raw)
                    ? raw.map((item) => parseValueByInputDataType(item, type))
                    : parseValueByInputDataType(raw, type);
            }
            return formatted;
        });
    };
    /**
     * Filters and sorts in-memory row data against a set of decoded filter entries,
     * without generating any SQL.
     *
     * Mirrors the Dart `FilterHelper.filterJSON`, fixing two bugs identified in the
     * source rather than porting them:
     *
     * - Dart increments its match counter even on the branch where a null value makes
     *   the entry non-matching, which can make an unrelated row spuriously "match"
     *   once enough null-valued filters are present. This port only counts an entry
     *   toward the required match total when it genuinely matched.
     * - Dart's `whereIn` branch calls `value.toString().contains(filter.value)`, a
     *   substring check, not membership — see {@link matchesFilterEntryValue} for the
     *   membership-correct replacement.
     *
     * Rows are returned unchanged (not even copied) when there are no active
     * filters/sort entries, matching the Dart short-circuit.
     *
     * @param {FilterData[]} filters - The decoded entries to apply.
     * @param {Record<string, unknown>[]} data - The rows to filter/sort.
     * @returns {Record<string, unknown>[]} The matching rows, sorted if a `sort` entry is present.
     */
    Helper.filterJSON = (filters, data) => {
        const active = (filters ?? []).filter((entry) => entry && entry.operator !== null && entry.operator !== undefined);
        if (!active.length)
            return data ?? [];
        let rows = _a.formatJSON(active, data ?? []);
        const sortEntry = active.find((entry) => entry.operator === FilterOperator.sort);
        const nonSort = active.filter((entry) => entry.operator !== FilterOperator.sort);
        if (nonSort.length) {
            rows = rows.filter((row) => {
                let matches = 0;
                for (const entry of nonSort) {
                    if (entry.operator === FilterOperator.any) {
                        matches += 1;
                        continue;
                    }
                    const rowValue = row[entry.id];
                    if (entry.value === null || entry.value === undefined || rowValue === null || rowValue === undefined)
                        continue;
                    if (matchesFilterEntryValue(rowValue, entry))
                        matches += 1;
                }
                return matches === nonSort.length;
            });
        }
        if (sortEntry) {
            const [target, direction] = sortEntry.value;
            const factor = direction === FilterOrder.desc ? -1 : 1;
            rows = [...rows].sort((a, b) => factor * compareValues(a[target], b[target]));
        }
        return rows;
    };
    FilterHelper.Helper = Helper;
})(FilterHelper || (FilterHelper = {}));
//# sourceMappingURL=filter-helper.js.map