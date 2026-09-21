export declare namespace FilterHelper {
    /**
     * Provenance of the Dart implementation this module mirrors.
     *
     * The wire format is a cross-language contract between the Dart encoder in
     * `fabric_flutter` and this TypeScript decoder.  Neither package imports the other,
     * so the only thing keeping them aligned is this pinned reference plus the
     * conformance vectors in `test/fixtures/filter-helper-vectors.json`, which assert the
     * same version and commit.  When the Dart side changes, update both together.
     */
    const dartSource: {
        readonly commit: "e03ff636333f157e485bff022582c8a267240b9e";
        readonly helper: "lib/helper/filter_helper.dart";
        readonly model: "lib/serialized/filter_data.dart";
        readonly package: "fabric_flutter";
        readonly repository: "https://github.com/FabricElements/fabric_flutter";
        readonly version: "3.0.1";
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
    enum FilterOperator {
        /** Matches values that are exactly equal. */
        equal = "equal",
        /** Matches values that are not equal. */
        notEqual = "notEqual",
        /** Matches string values that contain the provided text. */
        contains = "contains",
        /** Matches values strictly greater than the provided bound. */
        greaterThan = "greaterThan",
        /** Matches values greater than or equal to the provided bound. */
        greaterThanOrEqual = "greaterThanOrEqual",
        /** Matches values strictly less than the provided bound. */
        lessThan = "lessThan",
        /** Matches values less than or equal to the provided bound. */
        lessThanOrEqual = "lessThanOrEqual",
        /** Matches values within a range whose upper bound may be inclusive or exclusive. */
        between = "between",
        /** Matches any value without applying an additional constraint. Emits no predicate. */
        any = "any",
        /** Represents sorting rather than filtering semantics. Contributes to `ORDER BY`. */
        sort = "sort",
        /** Matches values that exist in a provided collection. */
        whereIn = "whereIn"
    }
    /**
     * Supported sort directions, matching the Dart `FilterOrder` enum.
     */
    enum FilterOrder {
        /** Sorts values in ascending order. */
        asc = "asc",
        /** Sorts values in descending order. */
        desc = "desc"
    }
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
    enum SQLQueryType {
        /** Generic SQL literal formatting (single-quoted strings, ISO date/time literals). */
        sql = "sql",
        /** BigQuery literal formatting (typed `DATE`/`DATETIME`/`TIMESTAMP` literals). */
        bigQuery = "bigQuery",
        /** OpenSearch SQL plugin literal formatting (`<>` for `notEqual`, scored match/wildcard `contains`). */
        openSearch = "openSearch"
    }
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
    enum InputDataType {
        /** Edits a calendar date without a time component. */
        date = "date",
        /** Edits a time-of-day value without an associated date. */
        time = "time",
        /** Edits a full date and time value. */
        dateTime = "dateTime",
        /** Edits a timestamp value serialized as a date and time. */
        timestamp = "timestamp",
        /** Edits an email address. */
        email = "email",
        /** Edits a signed integer value. */
        int = "int",
        /** Edits a floating-point number. */
        double = "double",
        /** Edits a numeric value representing currency. */
        currency = "currency",
        /** Edits a numeric value representing a percentage. */
        percent = "percent",
        /** Edits long-form multiline text. */
        text = "text",
        /** Selects from an enumerated list. */
        enums = "enums",
        /** Selects from a caller-provided option list. */
        dropdown = "dropdown",
        /** Edits a short free-form string. */
        string = "string",
        /** Selects one option from a radio-button group. */
        radio = "radio",
        /** Edits a phone number. */
        phone = "phone",
        /** Edits secret text, such as a password or token. */
        secret = "secret",
        /** Edits a URL. */
        url = "url",
        /** Edits a boolean value. */
        bool = "bool"
    }
    /**
     * BigQuery parameter types a filter field may declare.
     *
     * This is the bind type used for the generated query parameter.  It is always taken
     * from the server-side field declaration, never from the payload's advisory `type`.
     */
    type FilterParamType = 'BOOL' | 'DATE' | 'DATETIME' | 'FLOAT64' | 'INT64' | 'NUMERIC' | 'STRING' | 'TIMESTAMP';
    /**
     * A single scalar filter value.
     */
    type FilterScalar = boolean | number | string;
    /**
     * Any value a decoded filter entry may carry: a scalar, or a list for `between`,
     * `whereIn`, and `sort`.
     */
    type FilterValue = FilterScalar | (number | string)[];
    /**
     * One decoded, validated filter entry.
     *
     * Mirrors the Dart `FilterData` fields that are actually serialized.  The Dart model
     * also carries `label`, `enums`, `options`, `onChange`, and `group`, but all of those
     * are marked `includeToJson: false` and never appear on the wire.
     */
    interface InterfaceFilterData {
        /**
         * Stable identifier of the filtered field.
         *
         * For every operator except {@link FilterOperator.sort} this is a **key** looked up
         * in the decode allow-list; it is never treated as a column name and never reaches
         * SQL.  For a `sort` entry this is a free-form label (the Dart UI uses the literal
         * `'sort'`) and the sort target is carried in `value[0]` instead.
         */
        id: string;
        /** Display or processing order, used to order predicates and `ORDER BY` terms. */
        index?: number;
        /** The comparison or sorting operator. */
        operator: FilterOperator;
        /**
         * Advisory input type, mirroring the Dart `InputDataType` enum.
         *
         * This value is attacker-controlled and is retained only for round-trip fidelity
         * and logging.  **No security or binding decision depends on it** — BigQuery bind
         * types come from {@link InterfaceFilterField.paramType}.  It is nonetheless
         * validated against the closed {@link InputDataType} grammar so an unrecognized
         * value cannot be stored or echoed.
         *
         * Absent on input, it defaults to {@link InputDataType.string}, matching the Dart
         * `FilterData` constructor default.
         */
        type?: InputDataType;
        /** The filter value. Shape depends on the operator. */
        value: FilterValue;
    }
    /**
     * Server-side declaration of one filterable field.
     *
     * This declaration is the entire trust boundary of the module: it maps an opaque
     * payload `id` onto a real column, fixes the bind type, and names the operators the
     * field accepts.
     */
    interface InterfaceFilterField {
        /**
         * Real BigQuery column backing this field.
         *
         * Normally a single column name, validated with `validateBigQueryColumn`. Set
         * {@link InterfaceFilterField.structPath} to declare a dotted path into a `STRUCT`
         * instead, in which case every segment is validated separately.
         *
         * Optional, because a caller may use `decode` purely to validate an untrusted
         * payload and then build SQL from its own predicate table, never calling
         * `toQueryFragment`. Omitting it keeps a real column name out of a declaration that
         * does not need one. Omit it only in that case: `toQueryFragment` throws when it
         * needs a column this field never declared, rather than silently dropping the
         * predicate and widening the result set.
         */
        column?: string;
        /**
         * Whether a `between` range includes its upper bound.
         *
         * `'closed'` (the default) emits `>= lower AND <= upper`, matching the Dart
         * `FilterHelper` SQL builder and its in-memory matcher.  `'halfOpen'` emits
         * `>= lower AND < upper`, which is what a backend wants when consecutive ranges
         * tile a timeline: adjacent day, week or month buckets meet without the boundary
         * row being counted in both.
         *
         * Declare this per field; it is a property of the column's intended semantics, not
         * of the payload, so a caller cannot change it.
         */
        betweenBounds?: 'closed' | 'halfOpen';
        /**
         * Operators this field accepts.
         *
         * Required, and with no implicit default: a field permits exactly the operators it
         * names and nothing else. An omitted list once meant *every* operator, which made
         * the safe declaration the verbose one and let a field silently accept operators
         * its owner had no handling for. That matters most for a consumer that validates
         * with `decode` but emits its own SQL from a predicate table — an operator it
         * cannot express still has to be refused here, because nothing downstream will
         * refuse it.
         *
         * Pass `Object.values(FilterOperator)` to genuinely accept all of them; an empty
         * array accepts none. Either way the decision is written down rather than inferred.
         */
        operators: readonly FilterOperator[];
        /** BigQuery bind type used for this field's query parameters. */
        paramType: FilterParamType;
        /**
         * Whether {@link InterfaceFilterField.column} is a dotted path into a `STRUCT`.
         *
         * BigQuery column names cannot contain a period, so a dotted reference such as
         * `sentiment.text` is always a path into a struct and never the literal name of a
         * column. When this is `true` the declaration is split on `.`, each segment is
         * validated as a column name in its own right, and the reference is emitted with
         * every segment quoted separately — `` `sentiment`.`text` `` — which is how
         * BigQuery addresses a struct field.
         *
         * It is opt-in so that a stray period in a field meant to name a single column
         * stays a configuration error rather than silently becoming a path.  Leaving it
         * unset preserves the previous behaviour exactly: a dotted `column` is rejected.
         *
         * This changes only how the *declared* column is read. Payload `id` values are
         * opaque lookup keys and have always accepted dots, so a filter keyed on
         * `sentiment.text` needs no renaming on the client.
         */
        structPath?: boolean;
    }
    /**
     * Options controlling decoding and validation.
     */
    interface InterfaceFilterDecodeOptions {
        /**
         * Allow-list of filterable fields, keyed by the payload `id`.
         *
         * An `id` that is not present is rejected.  Supply a `Map` or a plain object; a
         * plain object is read with an own-property check so inherited keys can never
         * resolve.
         *
         * This decides **which identifiers are addressable**, not **which filters a given
         * caller may use**.  The map is static per report type, so it cannot express a
         * per-caller rule such as "this column is visible only to a platform admin."  Run
         * any such authorization check over the decoded entries yourself, after `decode`
         * and before building a fragment.
         */
        allowedFields: ReadonlyMap<string, InterfaceFilterField> | Readonly<Record<string, InterfaceFilterField>>;
        /** Maximum number of elements in a `whereIn` list. Defaults to `100`. */
        maxArrayLength?: number;
        /** Maximum length of the encoded string, checked before decoding. Defaults to `8192`. */
        maxEncodedLength?: number;
        /** Maximum number of filter entries in a payload. Defaults to `50`. */
        maxEntries?: number;
        /** Maximum length of any single string value. Defaults to `512`. */
        maxValueLength?: number;
    }
    /**
     * A parameterised query fragment built from decoded filter entries.
     *
     * `where` and `orderBy` contain only server-declared column names, fixed operator
     * text, and generated parameter placeholders.  No caller-supplied value ever appears
     * in either string.
     */
    interface InterfaceFilterQueryFragment {
        /**
         * Comma-separated `ORDER BY` terms without the `ORDER BY` keyword, or an empty
         * string when no sort entries were supplied.
         */
        orderBy: string;
        /** Bind parameter values keyed by generated parameter name (`f0`, `f1`, …). */
        params: Record<string, FilterValue>;
        /** BigQuery parameter types keyed by parameter name. An array type denotes a repeated parameter. */
        types: Record<string, FilterParamType | [FilterParamType]>;
        /**
         * Predicates joined with ` AND ` without the `WHERE` keyword, or an empty string
         * when no entry produced a predicate.  Callers must omit the `WHERE` keyword when
         * this is empty.
         */
        where: string;
    }
    /**
     * A partial filter entry used to update an existing filter list via {@link
     * Helper.merge}.
     *
     * The Dart `FilterData.operator` is nullable, so a Dart merge entry with a `null`
     * operator "clears" (removes) the matching filter. `InterfaceFilterData.operator` is
     * required in this port, so the same intent is expressed by omitting `operator`
     * entirely: an update with no `operator` removes the matching `id` from the result
     * instead of leaving a filter entry that cannot represent "no constraint".
     */
    type FilterMergeEntry = Partial<InterfaceFilterData> & {
        id: string;
    };
    /**
     * Decodes, validates, and converts the compact filter payload produced by the Dart
     * `FilterHelper`.
     */
    class Helper {
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
        static fromJSON: (filters: unknown, options: InterfaceFilterDecodeOptions) => InterfaceFilterData[];
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
        static decode: (filters: string | null | undefined, options: InterfaceFilterDecodeOptions) => InterfaceFilterData[];
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
        static toJSON: (filters: InterfaceFilterData[]) => Record<string, unknown>[];
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
        static encode: (filters: InterfaceFilterData[]) => string | null;
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
        static filterById: (filters: InterfaceFilterData[], id: string) => InterfaceFilterData | null;
        /**
         * Returns the value of the first active entry matching an id.
         *
         * Mirrors the Dart `FilterHelper.valueFromId`.
         *
         * @param {InterfaceFilterData[]} filters - The entries to search.
         * @param {string} id - The identifier to match.
         * @returns {FilterValue | null} The value, or `null` when there is no active match.
         */
        static valueFromId: (filters: InterfaceFilterData[], id: string) => FilterValue | null;
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
        static toQueryFragment: (filters: InterfaceFilterData[], options: InterfaceFilterDecodeOptions) => InterfaceFilterQueryFragment;
        /**
         * Decodes a base64 filter payload straight into a parameterised query fragment.
         *
         * @param {string | null | undefined} filters - The base64 payload.
         * @param {InterfaceFilterDecodeOptions} options - Decode options carrying the field allow-list.
         * @returns {InterfaceFilterQueryFragment} The parameterised fragment.
         * @throws {Error} When the payload is invalid or a declared column fails BigQuery validation.
         */
        static decodeToQueryFragment: (filters: string | null | undefined, options: InterfaceFilterDecodeOptions) => InterfaceFilterQueryFragment;
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
        static valueFromType: (value: FilterScalar | null | undefined, dataType: InputDataType, sqlQueryType?: SQLQueryType) => string | null;
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
         * @param {InterfaceFilterData[]} filters - The entries to convert.
         * @param {string} table - A `table`, `dataset.table`, or `project.dataset.table` path.
         * @param {InterfaceFilterDecodeOptions} options - Decode options carrying the field allow-list.
         * @param {number} [limit] - An optional non-negative row limit.
         * @param {SQLQueryType} [sqlQueryType] - The target SQL dialect. Defaults to `bigQuery`.
         * @returns {string} The generated `SELECT` statement.
         * @throws {Error} When an entry is malformed, `table` fails BigQuery validation, or `limit` is not a non-negative integer.
         */
        static toSQL: (filters: InterfaceFilterData[], table: string, options: InterfaceFilterDecodeOptions, limit?: number, sqlQueryType?: SQLQueryType) => string;
        /**
         * Encodes the output of {@link Helper.toSQL} as `base64(utf8(sql))`.
         *
         * Mirrors the Dart `FilterHelper.toSQLEncoded`. This is plain transport encoding,
         * not a security boundary: the safety of the generated SQL text comes entirely
         * from {@link Helper.toSQL}'s validation and escaping.
         *
         * @param {InterfaceFilterData[]} filters - The entries to convert.
         * @param {string} table - A `table`, `dataset.table`, or `project.dataset.table` path.
         * @param {InterfaceFilterDecodeOptions} options - Decode options carrying the field allow-list.
         * @param {number} [limit] - An optional non-negative row limit.
         * @param {SQLQueryType} [sqlQueryType] - The target SQL dialect. Defaults to `bigQuery`.
         * @returns {string} The base64-encoded UTF-8 SQL text.
         * @throws {Error} Under the same conditions as {@link Helper.toSQL}.
         */
        static toSQLEncoded: (filters: InterfaceFilterData[], table: string, options: InterfaceFilterDecodeOptions, limit?: number, sqlQueryType?: SQLQueryType) => string;
        /**
         * Builds a map of each entry's first-seen value keyed by id.
         *
         * Mirrors the Dart `FilterHelper.filterIdsValue`: it is a direct, unfiltered
         * lookup (unlike {@link Helper.filterById}/{@link Helper.valueFromId}, it does not
         * exclude `any`-operator entries), intended for callers that need a quick id →
         * value map for every entry present, regardless of operator.
         *
         * @param {InterfaceFilterData[]} filters - The entries to index.
         * @returns {Map<string, FilterValue>} A map of id to the first value seen for that id.
         */
        static filterIdsValue: (filters: InterfaceFilterData[]) => Map<string, FilterValue>;
        /**
         * Returns only the entries that represent an active constraint.
         *
         * Mirrors the Dart `FilterHelper.filter`. Every entry in this port already has a
         * non-null `operator`, so without `strict` this returns entries unchanged; with
         * `strict: true` it additionally excludes `any`-operator entries, which
         * contribute no predicate.
         *
         * @param {InterfaceFilterData[]} filters - The entries to filter.
         * @param {boolean} [strict] - When true, also excludes `any`-operator entries.
         * @returns {InterfaceFilterData[]} The active entries.
         */
        static filter: (filters: InterfaceFilterData[], strict?: boolean) => InterfaceFilterData[];
        /**
         * Applies a set of merge entries onto an existing filter list.
         *
         * Mirrors the Dart `FilterHelper.merge`, adapted for the non-nullable
         * `InterfaceFilterData.operator` in this port: see {@link FilterMergeEntry}. An
         * update whose id is not yet present is appended (assigned the next `index` when
         * none is supplied); an update matching an existing id overwrites that entry's
         * `operator`/`type`/`value`/`index` in place; an update with no `operator`
         * removes the matching entry instead of leaving an unrepresentable "cleared"
         * state.
         *
         * @param {InterfaceFilterData[]} filters - The existing entries.
         * @param {FilterMergeEntry[]} updates - The entries to merge in.
         * @returns {InterfaceFilterData[]} A new array with the updates applied.
         */
        static merge: (filters: InterfaceFilterData[], updates: FilterMergeEntry[]) => InterfaceFilterData[];
        /**
         * Parses every declared filter field's value on every row per its `InputDataType`.
         *
         * Mirrors the Dart `FilterHelper.formatJSON`. Only ids that appear both in
         * `filters` and as an own-enumerable key of a row are reformatted; every other row
         * key is passed through unchanged.
         *
         * @param {InterfaceFilterData[]} filters - The entries declaring each id's `InputDataType`.
         * @param {Record<string, unknown>[]} data - The rows to reformat.
         * @returns {Record<string, unknown>[]} A new array of rows with declared fields reformatted.
         */
        static formatJSON: (filters: InterfaceFilterData[], data: Record<string, unknown>[]) => Record<string, unknown>[];
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
         * @param {InterfaceFilterData[]} filters - The decoded entries to apply.
         * @param {Record<string, unknown>[]} data - The rows to filter/sort.
         * @returns {Record<string, unknown>[]} The matching rows, sorted if a `sort` entry is present.
         */
        static filterJSON: (filters: InterfaceFilterData[], data: Record<string, unknown>[]) => Record<string, unknown>[];
    }
}
