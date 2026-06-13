// noinspection JSUnusedGlobalSymbols

/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import {BigQuery} from '@google-cloud/bigquery';
import {adapt, managedwriter} from '@google-cloud/bigquery-storage';
import {logger} from 'firebase-functions/v2';

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
export class BigQueryStreamWriter {
  /**
   * Process-wide cache of singleton instances, keyed by `dataset.table`, used by
   * {@link BigQueryStreamWriter.getInstance} to keep one warm gRPC channel per
   * destination table.
   */
  private static instances = new Map<string, BigQueryStreamWriter>();

  private readonly dataset: string;
  private readonly table: string;
  private readonly maxBatchSize: number;
  private readonly flushIntervalMs: number;
  private readonly fieldTypes: Record<string, BigQueryFieldType>;

  /** In-memory buffer of coerced rows awaiting the next flush. */
  private buffer: BigQueryRow[] = [];
  /** Active time-based flush timer, or `undefined` when none is armed. */
  private flushTimer: ReturnType<typeof setTimeout> | undefined;

  // ---- Long-lived, reusable connection state (initialised once, then reused) ----
  private client: managedwriter.WriterClient | undefined;
  private connection: Awaited<ReturnType<managedwriter.WriterClient['createStreamConnection']>> | undefined;
  private writer: managedwriter.JSONWriter | undefined;
  /** Memoised initialisation promise, ensuring the writer is built exactly once. */
  private initPromise: Promise<void> | undefined;

  /**
   * Constructs a new writer. Prefer {@link BigQueryStreamWriter.getInstance} for
   * a process-wide singleton; use the constructor directly only when an
   * independent, separately-managed writer is required.
   *
   * @param {BigQueryStreamWriterOptions} options - Destination and batching configuration.
   * @throws {Error} When `options.dataset` or `options.table` is missing.
   */
  constructor(options: BigQueryStreamWriterOptions) {
    if (!options.dataset) throw new Error('dataset is required');
    if (!options.table) throw new Error('table is required');
    this.dataset = options.dataset;
    this.table = options.table;
    this.maxBatchSize = options.maxBatchSize ?? 500;
    this.flushIntervalMs = options.flushIntervalMs ?? 0;
    this.fieldTypes = options.fieldTypes ?? {};
  }

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
  static getInstance(options: BigQueryStreamWriterOptions): BigQueryStreamWriter {
    const key = `${options.dataset}.${options.table}`;
    let instance = BigQueryStreamWriter.instances.get(key);
    if (!instance) {
      instance = new BigQueryStreamWriter(options);
      BigQueryStreamWriter.instances.set(key, instance);
    }
    return instance;
  }

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
  private coerceRow(row: BigQueryRow): BigQueryRow {
    const out: BigQueryRow = {};
    for (const key of Object.keys(row)) {
      const value = row[key];
      const type = this.fieldTypes[key] ?? 'DEFAULT';
      if (value === null || value === undefined) {
        out[key] = value;
        continue;
      }
      switch (type) {
        case 'TIMESTAMP':
        case 'DATETIME':
          // Normalise temporal values to ISO 8601 strings the API accepts.
          out[key] = value instanceof Date ? value.toISOString() : value;
          break;
        case 'NUMERIC':
        case 'BIGNUMERIC':
          // Emit high-precision decimals as strings to avoid float truncation.
          out[key] = typeof value === 'string' ? value : String(value);
          break;
        default:
          out[key] = value;
      }
    }
    return out;
  }

  /**
   * Lazily initialises — and thereafter reuses — the long-lived `WriterClient`,
   * default-stream `StreamConnection`, and `JSONWriter`. The promise is memoised
   * so concurrent callers share a single initialisation and a single gRPC
   * channel.
   *
   * @returns {Promise<managedwriter.JSONWriter>} The ready, reusable JSON writer.
   * @throws {Error} When table metadata cannot be read or the stream connection fails.
   */
  private async ensureWriter(): Promise<managedwriter.JSONWriter> {
    if (this.writer) return this.writer;
    if (!this.initPromise) {
      this.initPromise = (async () => {
        const bigquery = new BigQuery();
        // Fetch the table schema (for the protobuf descriptor) and the project id
        // from the same metadata call; the Cloud Run runtime supplies the project.
        const [metadata] = await bigquery.dataset(this.dataset).table(this.table).getMetadata();
        const projectId = metadata.tableReference.projectId;
        const storageSchema = adapt.convertBigQuerySchemaToStorageTableSchema(metadata.schema);
        const protoDescriptor = adapt.convertStorageSchemaToProto2Descriptor(storageSchema, 'root');

        // Default Stream path: committed-on-append, shareable, no stream to create.
        // Pass the fully-qualified `_default` stream path as the streamId so the
        // SDK uses it verbatim (passing the DefaultStream sentinel alongside a
        // suffixed table would duplicate the `/streams/_default` segment).
        const defaultStreamPath =
          `projects/${projectId}/datasets/${this.dataset}/tables/${this.table}/streams/_default`;

        this.client = new managedwriter.WriterClient();
        this.connection = await this.client.createStreamConnection({
          streamId: defaultStreamPath,
        });
        const writer = new managedwriter.JSONWriter({
          connection: this.connection,
          protoDescriptor,
        });
        // Missing columns fall back to their schema default value; rows with
        // unknown extra fields are rejected server-side.
        writer.setDefaultMissingValueInterpretation('DEFAULT_VALUE');
        this.writer = writer;
      })();
    }
    await this.initPromise;
    return this.writer as managedwriter.JSONWriter;
  }

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
  async add(row: BigQueryRow): Promise<void> {
    this.buffer.push(this.coerceRow(row));
    if (this.buffer.length >= this.maxBatchSize) {
      await this.flush();
      return;
    }
    this.armFlushTimer();
  }

  /**
   * Adds multiple rows to the buffer, flushing full batches as the threshold is
   * crossed.
   *
   * @param {BigQueryRow[]} rows - The rows to enqueue.
   * @returns {Promise<void>} Resolves once all rows are buffered and any full
   *   batches have been written.
   * @throws {Error} Propagates any flush error.
   */
  async addRows(rows: BigQueryRow[]): Promise<void> {
    for (const row of rows) {
      // Reuse single-row logic so size-threshold flushing applies uniformly.
      await this.add(row);
    }
  }

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
  async flush(): Promise<void> {
    this.clearFlushTimer();
    if (this.buffer.length === 0) return;
    // Detach the current buffer so new rows can accumulate during the await.
    const batch = this.buffer;
    this.buffer = [];
    const writer = await this.ensureWriter();
    const pendingWrite = writer.appendRows(batch as Parameters<managedwriter.JSONWriter['appendRows']>[0]);
    const response = await pendingWrite.getResult();
    if (response.error) {
      const message = response.error.message ?? JSON.stringify(response.error);
      logger.error(`BigQuery Storage Write append failed for "${this.dataset}.${this.table}": ${message}`);
      throw new Error(message);
    }
    if (response.rowErrors && response.rowErrors.length > 0) {
      const message = JSON.stringify(response.rowErrors);
      logger.error(`BigQuery Storage Write row errors for "${this.dataset}.${this.table}": ${message}`);
      throw new Error(message);
    }
  }

  /**
   * Flushes any remaining buffered rows, then tears down the long-lived writer
   * and client. Call during graceful shutdown; subsequent writes lazily
   * re-establish the connection.
   *
   * @returns {Promise<void>} Resolves once buffered rows are written and the
   *   connection is closed.
   * @throws {Error} Propagates any error raised by the final flush.
   */
  async close(): Promise<void> {
    this.clearFlushTimer();
    try {
      await this.flush();
    } finally {
      this.writer?.close();
      this.client?.close();
      this.writer = undefined;
      this.connection = undefined;
      this.client = undefined;
      this.initPromise = undefined;
    }
  }

  /**
   * Arms the time-based flush timer when `flushIntervalMs` is enabled and no
   * timer is currently pending. The timer flushes the buffer and logs (rather
   * than throws) on failure, since it runs detached from any caller.
   *
   * @returns {void}
   */
  private armFlushTimer(): void {
    if (this.flushIntervalMs <= 0 || this.flushTimer) return;
    this.flushTimer = setTimeout(() => {
      this.flushTimer = undefined;
      this.flush().catch((error: unknown) => {
        const message = error instanceof Error ? error.message : JSON.stringify(error);
        logger.error(`BigQuery Storage Write timed flush failed for "${this.dataset}.${this.table}": ${message}`);
      });
    }, this.flushIntervalMs);
    // Avoid keeping the event loop alive solely for a pending flush timer.
    this.flushTimer.unref?.();
  }

  /**
   * Cancels any pending time-based flush timer.
   *
   * @returns {void}
   */
  private clearFlushTimer(): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = undefined;
    }
  }
}

export default BigQueryStreamWriter;
