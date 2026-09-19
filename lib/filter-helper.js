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
 * - The column name comes from {@link FilterHelper.InterfaceFilterField.column} in the
 *   caller-supplied allow-list, never from the payload.
 * - The comparison operator comes from a frozen lookup table keyed by a closed enum.
 * - Every value is bound as a query parameter (`@f0`, `@f1`, …) and is never
 *   concatenated into SQL text.
 *
 * The payload therefore contributes exactly three tightly constrained things: an `id`
 * used as a **key lookup** into the allow-list, an `operator` validated against a
 * closed enum, and a `value` that only ever becomes a bind parameter.
 *
 * This module is a port of the declarative half of the Dart implementation.  The
 * SQL-emitting Dart helpers (`toSQL`, `toSQLEncoded`, `_sqlOperator`) are deliberately
 * **not** ported: restoring raw SQL from a client payload is the exact risk this module
 * exists to remove, and a payload that base64-decodes to SQL text rather than a JSON
 * array is rejected outright with no fallback.
 *
 * Note: this module is unrelated to `firestore-helper.ts`.  `FirestoreHelper` has its
 * own `where` clause shape with a different operator vocabulary (`'=='`,
 * `'array-contains'`); the two are structurally similar but semantically distinct and
 * must not be adapted to one another.
 *
 * @see https://github.com/FabricElements/fabric_flutter/blob/e03ff636333f157e485bff022582c8a267240b9e/lib/helper/filter_helper.dart
 * @see https://github.com/FabricElements/fabric_flutter/blob/e03ff636333f157e485bff022582c8a267240b9e/lib/serialized/filter_data.dart
 */
import { validateBigQueryColumn } from './bigquery-identifier.js';
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
     * @param {ReadonlyMap<string, InterfaceFilterField> | Readonly<Record<string, InterfaceFilterField>>} allowedFields - The allow-list.
     * @param {string} id - The payload identifier to resolve.
     * @returns {InterfaceFilterField | undefined} The declaration, or `undefined` when the id is not allow-listed.
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
     * @param {InterfaceFilterField} field - The server-side field declaration.
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
     * @param {InterfaceFilterField} field - The server-side field declaration.
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
     * @param {InterfaceFilterDecodeOptions} options - Decode options carrying the allow-list.
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
     * Validates one raw entry and normalises it into an {@link InterfaceFilterData}.
     *
     * Entries that carry no constraint are dropped by returning `null`.  This mirrors the
     * Dart encoder, which emits cleared filters instead of removing them, and is not a
     * relaxation: a dropped entry produces no predicate and never reaches SQL.
     *
     * @param {unknown} raw - The raw parsed entry.
     * @param {number} position - Index of the entry within the payload.
     * @param {InterfaceFilterDecodeOptions} options - Decode options.
     * @returns {InterfaceFilterData | null} The validated entry, or `null` when it should be dropped.
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
     * @param {InterfaceFilterField} field - The server-side field declaration.
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
     * @param {InterfaceFilterData[]} entries - The validated entries.
     * @returns {InterfaceFilterData[]} A new, ordered array.
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
     * @param {InterfaceFilterData[]} entries - Already validated entries.
     * @param {InterfaceFilterDecodeOptions} options - Decode options carrying the allow-list.
     * @returns {InterfaceFilterQueryFragment} The parameterised fragment.
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
     * @param {InterfaceFilterDecodeOptions} options - Decode options carrying the field allow-list.
     * @returns {InterfaceFilterData[]} The validated entries, in payload order.
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
     * @param {InterfaceFilterDecodeOptions} options - Decode options carrying the field allow-list.
     * @returns {InterfaceFilterData[]} The validated entries.
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
     * @param {InterfaceFilterData[]} filters - The entries to serialize.
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
     * @param {InterfaceFilterData[]} filters - The entries to encode.
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
     * @param {InterfaceFilterData[]} filters - The entries to search.
     * @param {string} id - The identifier to match.
     * @returns {InterfaceFilterData | null} The matching entry, or `null` when there is none.
     */
    Helper.filterById = (filters, id) => (filters ?? [])
        .find((entry) => entry && entry.id === id && entry.operator !== FilterOperator.any) ?? null;
    /**
     * Returns the value of the first active entry matching an id.
     *
     * Mirrors the Dart `FilterHelper.valueFromId`.
     *
     * @param {InterfaceFilterData[]} filters - The entries to search.
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
     * @param {InterfaceFilterData[]} filters - The entries to convert.
     * @param {InterfaceFilterDecodeOptions} options - Decode options carrying the field allow-list.
     * @returns {InterfaceFilterQueryFragment} The parameterised fragment.
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
     * @param {InterfaceFilterDecodeOptions} options - Decode options carrying the field allow-list.
     * @returns {InterfaceFilterQueryFragment} The parameterised fragment.
     * @throws {Error} When the payload is invalid or a declared column fails BigQuery validation.
     */
    Helper.decodeToQueryFragment = (filters, options) => buildFragment(_a.decode(filters, options), options);
    FilterHelper.Helper = Helper;
})(FilterHelper || (FilterHelper = {}));
//# sourceMappingURL=filter-helper.js.map