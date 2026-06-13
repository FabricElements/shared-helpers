/**
 * Supported BigQuery column types that require explicit client-side coercion
 * before serialization. Any column not listed in a writer's `fieldTypes` map is
 * passed through untouched (`DEFAULT`).
 *
 * - `TIMESTAMP` / `DATETIME` values are normalised to ISO 8601 strings via
 *   `Date.prototype.toISOString()`.
 * - `NUMERIC` / `BIGNUMERIC` values are emitted as strings so that
 *   high-precision decimals are never truncated by JavaScript's IEEE-754
 *   floating-point representation.
 */
export type BigQueryFieldType = 'TIMESTAMP' | 'DATETIME' | 'NUMERIC' | 'BIGNUMERIC' | 'DEFAULT';
/**
 * A single row to be streamed into BigQuery. Keys are column names and values
 * are native TypeScript primitives/objects; the writer coerces them according
 * to its configured `fieldTypes` map before protobuf serialization.
 */
export type BigQueryRow = Record<string, unknown>;
/**
 * Configuration for a {@link BigQueryStreamWriter} instance.
 */
export interface BigQueryStreamWriterOptions {
    /** BigQuery dataset identifier that owns the destination table. */
    dataset: string;
    /** BigQuery table identifier within `dataset`. */
    table: string;
    /**
     * Maximum number of buffered rows before an automatic flush is triggered.
     * Defaults to `500`. Rows are accumulated in memory and sent as a single
     * `appendRows` batch once this threshold is reached.
     */
    maxBatchSize?: number;
    /**
     * Optional time-based flush interval in milliseconds. When greater than `0`, a
     * timer flushes any buffered rows after this many milliseconds of inactivity,
     * bounding ingestion latency for low-throughput streams. Defaults to `0`
     * (time-based flushing disabled; rows flush only on `maxBatchSize` or an
     * explicit {@link BigQueryStreamWriter.flush} call).
     */
    flushIntervalMs?: number;
    /**
     * Optional map of column name to {@link BigQueryFieldType} used to coerce
     * values to BigQuery-safe representations prior to serialization. Columns
     * absent from this map are written as-is.
     */
    fieldTypes?: Record<string, BigQueryFieldType>;
}
/**
 * Production-grade wrapper around the BigQuery Storage Write API
 * (`@google-cloud/bigquery-storage` `managedwriter`) that streams native
 * TypeScript objects into a BigQuery table via the table's default stream.
 *
 * The default stream provides at-least-once, committed-on-append semantics and
 * is the modern, high-throughput replacement for the legacy
 * `tabledata.insertAll` streaming insert.
 *
 * ### Long-lived state &amp; connection management
 * Each instance lazily creates — and then **reuses** — a single
 * `managedwriter.WriterClient`, `StreamConnection`, and `JSONWriter`. These are
 * held as instance properties (`#client`, `#connection`, `#writer`) so the
 * underlying persistent gRPC channel is established **once** and shared across
 * every `appendRows` call, rather than being torn down per row or per function
 * invocation. Prefer {@link BigQueryStreamWriter.getInstance} to obtain a
 * process-wide singleton per table, which keeps the gRPC channel warm across
 * Cloud Run requests on the same container instance.
 *
 * ### Backpressure &amp; chunked loads
 * Rows are accumulated in an in-memory buffer and flushed as a single batch
 * once {@link BigQueryStreamWriterOptions.maxBatchSize} rows are queued (or after
 * {@link BigQueryStreamWriterOptions.flushIntervalMs}). Each flush `await`s the
 * `PendingWrite` result before returning, so callers that `await` their writes
 * observe natural backpressure: a slow BigQuery backend slows the producer
 * instead of letting the buffer grow unbounded.
 *
 * The destination project is taken from the resolved table metadata, which the
 * Cloud Run runtime provides automatically — callers only supply `dataset` and
 * `table` and never need to specify a project id.
 */
export declare class BigQueryStreamWriter {
    /**
     * Process-wide cache of singleton instances, keyed by `dataset.table`, used by
     * {@link BigQueryStreamWriter.getInstance} to keep one warm gRPC channel per
     * destination table.
     */
    private static instances;
    private readonly dataset;
    private readonly table;
    private readonly maxBatchSize;
    private readonly flushIntervalMs;
    private readonly fieldTypes;
    /** In-memory buffer of coerced rows awaiting the next flush. */
    private buffer;
    /** Active time-based flush timer, or `undefined` when none is armed. */
    private flushTimer;
    private client;
    private connection;
    private writer;
    /** Memoised initialisation promise, ensuring the writer is built exactly once. */
    private initPromise;
    /**
     * Constructs a new writer. Prefer {@link BigQueryStreamWriter.getInstance} for
     * a process-wide singleton; use the constructor directly only when an
     * independent, separately-managed writer is required.
     *
     * @param {BigQueryStreamWriterOptions} options - Destination and batching configuration.
     * @throws {Error} When `options.dataset` or `options.table` is missing.
     */
    constructor(options: BigQueryStreamWriterOptions);
    /**
     * Returns the process-wide singleton writer for the given `dataset.table`,
     * creating it on first use. Reusing the same instance keeps the long-lived
     * gRPC channel warm across invocations on the same Cloud Run container.
     *
     * @param {BigQueryStreamWriterOptions} options - Destination and batching configuration.
     *   The cache key is `dataset.table`; options supplied on the first call for a
     *   given table define that singleton's behaviour.
     * @returns {BigQueryStreamWriter} The cached or newly-created singleton instance.
     */
    static getInstance(options: BigQueryStreamWriterOptions): BigQueryStreamWriter;
    /**
     * Coerces a single raw row into a BigQuery-safe payload according to the
     * configured `fieldTypes` map.
     *
     * `TIMESTAMP`/`DATETIME` values are converted to ISO-8601 strings and
     * `NUMERIC`/`BIGNUMERIC` values to plain strings (preserving precision).
     * `null`/`undefined` values are passed through so column defaults apply.
     *
     * @param {BigQueryRow} row - The raw input row.
     * @returns {BigQueryRow} A new row object with coerced values.
     */
    private coerceRow;
    /**
     * Lazily initialises — and thereafter reuses — the long-lived `WriterClient`,
     * default-stream `StreamConnection`, and `JSONWriter`. The promise is memoised
     * so concurrent callers share a single initialisation and a single gRPC
     * channel.
     *
     * @returns {Promise<managedwriter.JSONWriter>} The ready, reusable JSON writer.
     * @throws {Error} When table metadata cannot be read or the stream connection fails.
     */
    private ensureWriter;
    /**
     * Adds a single row to the in-memory buffer, flushing automatically once the
     * buffer reaches `maxBatchSize`. When `flushIntervalMs` is configured, a timer
     * is (re)armed so partially-filled batches are not held indefinitely.
     *
     * @param {BigQueryRow} row - The row to enqueue.
     * @returns {Promise<void>} Resolves once the row is buffered (and, if the size
     *   threshold was reached, once the resulting batch has been written).
     * @throws {Error} Propagates any flush error when the size threshold triggers a write.
     */
    add(row: BigQueryRow): Promise<void>;
    /**
     * Adds multiple rows to the buffer, flushing full batches as the threshold is
     * crossed.
     *
     * @param {BigQueryRow[]} rows - The rows to enqueue.
     * @returns {Promise<void>} Resolves once all rows are buffered and any full
     *   batches have been written.
     * @throws {Error} Propagates any flush error.
     */
    addRows(rows: BigQueryRow[]): Promise<void>;
    /**
     * Flushes all buffered rows to BigQuery as a single `appendRows` batch and
     * awaits the result, providing backpressure. Inspects the gRPC response and
     * throws when the server reports a failure.
     *
     * @returns {Promise<void>} Resolves when the batch is committed, or immediately
     *   when the buffer is empty.
     * @throws {Error} When the Storage Write API returns a `response.error` status
     *   or per-row `rowErrors`.
     */
    flush(): Promise<void>;
    /**
     * Flushes any remaining buffered rows, then tears down the long-lived writer
     * and client. Call during graceful shutdown; subsequent writes lazily
     * re-establish the connection.
     *
     * @returns {Promise<void>} Resolves once buffered rows are written and the
     *   connection is closed.
     * @throws {Error} Propagates any error raised by the final flush.
     */
    close(): Promise<void>;
    /**
     * Arms the time-based flush timer when `flushIntervalMs` is enabled and no
     * timer is currently pending. The timer flushes the buffer and logs (rather
     * than throws) on failure, since it runs detached from any caller.
     *
     * @returns {void}
     */
    private armFlushTimer;
    /**
     * Cancels any pending time-based flush timer.
     *
     * @returns {void}
     */
    private clearFlushTimer;
}
export default BigQueryStreamWriter;
