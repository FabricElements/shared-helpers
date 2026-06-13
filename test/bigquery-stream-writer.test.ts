/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

// ---------- BigQuery Storage Write API mocks (vi.hoisted so factories can reference them) ----------
const {
  mockGetResult,
  mockAppendRows,
  mockJSONWriterClose,
  mockSetDefaultMissing,
  mockCreateStreamConnection,
  mockWriterClientClose,
  mockConvertBigQuerySchema,
  mockConvertStorageSchema,
  mockWriterClientCtor,
  mockJSONWriterCtor,
  mockLoggerError,
} = vi.hoisted(() => {
  const mockGetResult = vi.fn().mockResolvedValue({});
  const mockAppendRows = vi.fn(() => ({getResult: mockGetResult}));
  const mockJSONWriterClose = vi.fn();
  const mockSetDefaultMissing = vi.fn();
  const mockCreateStreamConnection = vi.fn().mockResolvedValue({id: 'conn'});
  const mockWriterClientClose = vi.fn();
  const mockConvertBigQuerySchema = vi.fn((s: unknown) => s);
  const mockConvertStorageSchema = vi.fn(() => ({name: 'root', field: []}));
  const mockWriterClientCtor = vi.fn(function() {
    return {
      createStreamConnection: mockCreateStreamConnection,
      close: mockWriterClientClose,
    };
  });
  const mockJSONWriterCtor = vi.fn(function() {
    return {
      appendRows: mockAppendRows,
      close: mockJSONWriterClose,
      setDefaultMissingValueInterpretation: mockSetDefaultMissing,
    };
  });
  const mockLoggerError = vi.fn();
  return {
    mockGetResult,
    mockAppendRows,
    mockJSONWriterClose,
    mockSetDefaultMissing,
    mockCreateStreamConnection,
    mockWriterClientClose,
    mockConvertBigQuerySchema,
    mockConvertStorageSchema,
    mockWriterClientCtor,
    mockJSONWriterCtor,
    mockLoggerError,
  };
});

vi.mock('@google-cloud/bigquery-storage', () => ({
  managedwriter: {
    WriterClient: mockWriterClientCtor,
    JSONWriter: mockJSONWriterCtor,
    DefaultStream: 'DEFAULT',
  },
  adapt: {
    convertBigQuerySchemaToStorageTableSchema: mockConvertBigQuerySchema,
    convertStorageSchemaToProto2Descriptor: mockConvertStorageSchema,
  },
}));

// ---------- BigQuery mock ----------
const mockGetMetadata = vi.fn();
const mockTable = vi.fn(() => ({getMetadata: mockGetMetadata}));
const mockDataset = vi.fn(() => ({table: mockTable}));

vi.mock('@google-cloud/bigquery', () => ({
  BigQuery: vi.fn(function() {
    return {dataset: mockDataset};
  }),
}));

// ---------- Firebase Functions logger mock ----------
vi.mock('firebase-functions/v2', () => ({
  logger: {info: vi.fn(), warn: vi.fn(), error: mockLoggerError, log: vi.fn()},
}));

import {BigQueryStreamWriter} from '../src/bigquery-stream-writer.js';

describe('BigQueryStreamWriter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetMetadata.mockResolvedValue([{
      schema: {fields: [{name: 'id', type: 'STRING'}]},
      tableReference: {projectId: 'test-project', datasetId: 'ds', tableId: 'tbl'},
    }]);
    mockGetResult.mockResolvedValue({});
    mockCreateStreamConnection.mockResolvedValue({id: 'conn'});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('construction', () => {
    it('throws when dataset is missing', () => {
      expect(() => new BigQueryStreamWriter({dataset: '', table: 'tbl'}))
        .toThrow('dataset is required');
    });

    it('throws when table is missing', () => {
      expect(() => new BigQueryStreamWriter({dataset: 'ds', table: ''}))
        .toThrow('table is required');
    });
  });

  describe('getInstance', () => {
    it('returns the same singleton for a given dataset.table', () => {
      const a = BigQueryStreamWriter.getInstance({dataset: 'dsx', table: 'tblx'});
      const b = BigQueryStreamWriter.getInstance({dataset: 'dsx', table: 'tblx'});
      expect(a).toBe(b);
    });

    it('returns distinct instances for different tables', () => {
      const a = BigQueryStreamWriter.getInstance({dataset: 'dsx', table: 't1'});
      const b = BigQueryStreamWriter.getInstance({dataset: 'dsx', table: 't2'});
      expect(a).not.toBe(b);
    });
  });

  describe('batching by size', () => {
    it('does not flush before maxBatchSize is reached', async () => {
      const writer = new BigQueryStreamWriter({dataset: 'ds', table: 'tbl', maxBatchSize: 3});
      await writer.add({id: 'a'});
      await writer.add({id: 'b'});
      expect(mockAppendRows).not.toHaveBeenCalled();
    });

    it('flushes automatically when maxBatchSize is reached', async () => {
      const writer = new BigQueryStreamWriter({dataset: 'ds', table: 'tbl', maxBatchSize: 2});
      await writer.add({id: 'a'});
      await writer.add({id: 'b'});
      expect(mockAppendRows).toHaveBeenCalledTimes(1);
      expect(mockAppendRows).toHaveBeenCalledWith([{id: 'a'}, {id: 'b'}]);
    });

    it('reuses a single writer/connection across multiple flushes', async () => {
      const writer = new BigQueryStreamWriter({dataset: 'ds', table: 'tbl', maxBatchSize: 1});
      await writer.add({id: 'a'});
      await writer.add({id: 'b'});
      expect(mockAppendRows).toHaveBeenCalledTimes(2);
      // Long-lived: client + connection + JSONWriter built only once.
      expect(mockWriterClientCtor).toHaveBeenCalledTimes(1);
      expect(mockCreateStreamConnection).toHaveBeenCalledTimes(1);
      expect(mockJSONWriterCtor).toHaveBeenCalledTimes(1);
    });
  });

  describe('default stream path', () => {
    it('targets the default stream using the project from table metadata', async () => {
      const writer = new BigQueryStreamWriter({dataset: 'ds', table: 'tbl', maxBatchSize: 1});
      await writer.add({id: 'a'});
      expect(mockCreateStreamConnection).toHaveBeenCalledWith(
        expect.objectContaining({
          streamId: 'projects/test-project/datasets/ds/tables/tbl/streams/_default',
        }),
      );
      expect(mockSetDefaultMissing).toHaveBeenCalledWith('DEFAULT_VALUE');
    });
  });

  describe('type-safe coercion', () => {
    it('formats TIMESTAMP/DATETIME Date values via toISOString and NUMERIC as strings', async () => {
      const writer = new BigQueryStreamWriter({
        dataset: 'ds',
        table: 'tbl',
        maxBatchSize: 1,
        fieldTypes: {created: 'TIMESTAMP', when: 'DATETIME', amount: 'NUMERIC', big: 'BIGNUMERIC'},
      });
      const date = new Date('2026-01-02T03:04:05.000Z');
      await writer.add({id: 'a', created: date, when: date, amount: 12.34, big: 99n});
      expect(mockAppendRows).toHaveBeenCalledWith([{
        id: 'a',
        created: '2026-01-02T03:04:05.000Z',
        when: '2026-01-02T03:04:05.000Z',
        amount: '12.34',
        big: '99',
      }]);
    });

    it('passes through null values untouched', async () => {
      const writer = new BigQueryStreamWriter({
        dataset: 'ds',
        table: 'tbl',
        maxBatchSize: 1,
        fieldTypes: {amount: 'NUMERIC'},
      });
      await writer.add({id: 'a', amount: null});
      expect(mockAppendRows).toHaveBeenCalledWith([{id: 'a', amount: null}]);
    });
  });

  describe('explicit flush', () => {
    it('is a no-op when the buffer is empty', async () => {
      const writer = new BigQueryStreamWriter({dataset: 'ds', table: 'tbl'});
      await writer.flush();
      expect(mockAppendRows).not.toHaveBeenCalled();
    });

    it('flushes buffered rows below the size threshold on demand', async () => {
      const writer = new BigQueryStreamWriter({dataset: 'ds', table: 'tbl', maxBatchSize: 100});
      await writer.add({id: 'a'});
      await writer.flush();
      expect(mockAppendRows).toHaveBeenCalledWith([{id: 'a'}]);
    });
  });

  describe('error handling', () => {
    it('throws when the gRPC response carries an error status', async () => {
      mockGetResult.mockResolvedValue({error: {code: 3, message: 'bad row'}});
      const writer = new BigQueryStreamWriter({dataset: 'ds', table: 'tbl', maxBatchSize: 1});
      await expect(writer.add({id: 'a'})).rejects.toThrow('bad row');
      expect(mockLoggerError).toHaveBeenCalled();
    });

    it('throws when the response reports per-row errors', async () => {
      mockGetResult.mockResolvedValue({rowErrors: [{index: 0, message: 'schema mismatch'}]});
      const writer = new BigQueryStreamWriter({dataset: 'ds', table: 'tbl', maxBatchSize: 1});
      await expect(writer.add({id: 'a'})).rejects.toThrow('schema mismatch');
    });
  });

  describe('discard', () => {
    it('drops buffered rows so they are never written', async () => {
      const writer = new BigQueryStreamWriter({dataset: 'ds', table: 'tbl', maxBatchSize: 100});
      await writer.add({id: 'a'});
      writer.discard();
      await writer.flush();
      expect(mockAppendRows).not.toHaveBeenCalled();
    });

    it('leaves close as a no-op append after discarding', async () => {
      const writer = new BigQueryStreamWriter({dataset: 'ds', table: 'tbl', maxBatchSize: 100});
      await writer.add({id: 'a'});
      writer.discard();
      await writer.close();
      expect(mockAppendRows).not.toHaveBeenCalled();
    });
  });

  describe('close', () => {
    it('flushes remaining rows and closes the writer and client', async () => {
      const writer = new BigQueryStreamWriter({dataset: 'ds', table: 'tbl', maxBatchSize: 100});
      await writer.add({id: 'a'});
      await writer.close();
      expect(mockAppendRows).toHaveBeenCalledWith([{id: 'a'}]);
      expect(mockJSONWriterClose).toHaveBeenCalledTimes(1);
      expect(mockWriterClientClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('time-based flushing', () => {
    it('flushes buffered rows after flushIntervalMs', async () => {
      vi.useFakeTimers();
      try {
        const writer = new BigQueryStreamWriter({
          dataset: 'ds',
          table: 'tbl',
          maxBatchSize: 100,
          flushIntervalMs: 1000,
        });
        await writer.add({id: 'a'});
        expect(mockAppendRows).not.toHaveBeenCalled();
        await vi.advanceTimersByTimeAsync(1000);
        expect(mockAppendRows).toHaveBeenCalledWith([{id: 'a'}]);
      } finally {
        vi.useRealTimers();
      }
    });
  });
});
