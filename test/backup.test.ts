/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import {beforeEach, describe, expect, it, vi} from 'vitest';

// ---------- BigQuery Storage Write API mocks (vi.hoisted so factories can reference them) ----------
const {
  mockGetResult,
  mockAppendRows,
  mockJSONWriterClose,
  mockCreateStreamConnection,
  mockWriterClientClose,
  mockConvertBigQuerySchema,
  mockConvertStorageSchema,
} = vi.hoisted(() => {
  const mockGetResult = vi.fn().mockResolvedValue({});
  const mockAppendRows = vi.fn(() => ({getResult: mockGetResult}));
  const mockJSONWriterClose = vi.fn();
  const mockCreateStreamConnection = vi.fn().mockResolvedValue({
    onSchemaUpdated: vi.fn(() => ({off: vi.fn()})),
  });
  const mockWriterClientClose = vi.fn();
  const mockConvertBigQuerySchema = vi.fn((s: unknown) => s);
  const mockConvertStorageSchema = vi.fn(() => ({name: 'root', field: []}));
  return {
    mockGetResult,
    mockAppendRows,
    mockJSONWriterClose,
    mockCreateStreamConnection,
    mockWriterClientClose,
    mockConvertBigQuerySchema,
    mockConvertStorageSchema,
  };
});

vi.mock('@google-cloud/bigquery-storage', () => ({
  managedwriter: {
    WriterClient: vi.fn(function() {
      return {
        createStreamConnection: mockCreateStreamConnection,
        close: mockWriterClientClose,
      };
    }),
    JSONWriter: vi.fn(function() {
      return {
        appendRows: mockAppendRows,
        close: mockJSONWriterClose,
        setDefaultMissingValueInterpretation: vi.fn(),
      };
    }),
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

// ---------- Firestore mock ----------
const mockBatchCommit = vi.fn().mockResolvedValue(undefined);
const mockBatchUpdate = vi.fn();
const mockBatchDelete = vi.fn();
const mockBatch = vi.fn(() => ({
  commit: mockBatchCommit,
  update: mockBatchUpdate,
  delete: mockBatchDelete,
}));
const mockDoc = vi.fn(() => ({id: 'doc1'}));
const mockCollection = vi.fn(() => ({doc: mockDoc}));

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => ({
    batch: mockBatch,
    collection: mockCollection,
  })),
}));

// ---------- Firebase Functions logger mock ----------
vi.mock('firebase-functions/v2', () => ({
  logger: {info: vi.fn(), warn: vi.fn(), error: vi.fn(), log: vi.fn()},
}));

// ---------- global timeout mock (skip real waits) ----------
vi.mock('../src/global.js', () => ({
  timeout: vi.fn().mockResolvedValue(undefined),
}));

import backup from '../src/backup.js';

describe('backup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetMetadata.mockResolvedValue([{
      schema: {fields: [{name: 'id', type: 'STRING'}]},
      tableReference: {projectId: 'test-project', datasetId: 'ds', tableId: 'tbl'},
    }]);
    mockGetResult.mockResolvedValue({});
    mockCreateStreamConnection.mockResolvedValue({
      onSchemaUpdated: vi.fn(() => ({off: vi.fn()})),
    });
    mockBatchCommit.mockResolvedValue(undefined);
  });

  describe('input validation', () => {
    it('throws when collection is missing', async () => {
      await expect(
        backup({collection: '', dataset: 'ds', items: [], table: 'tbl'}),
      ).rejects.toThrow('collection is required');
    });

    it('throws when dataset is missing', async () => {
      await expect(
        backup({collection: 'col', dataset: '', items: [], table: 'tbl'}),
      ).rejects.toThrow('dataset is required');
    });

    it('throws when items is missing', async () => {
      await expect(
        backup({collection: 'col', dataset: 'ds', items: null as unknown as string[], table: 'tbl'}),
      ).rejects.toThrow('items is required');
    });

    it('throws when table is missing', async () => {
      await expect(
        backup({collection: 'col', dataset: 'ds', items: [], table: ''}),
      ).rejects.toThrow('table is required');
    });
  });

  describe('empty items list', () => {
    it('logs and returns early when items is empty', async () => {
      await backup({collection: 'col', dataset: 'ds', items: [], table: 'tbl'});
      expect(mockAppendRows).not.toHaveBeenCalled();
    });
  });

  describe('successful BigQuery write without Firestore update', () => {
    it('writes items via the Storage Write API to the correct destination', async () => {
      const items = [{id: 'a', value: 1}, {id: 'b', value: 2}];
      await backup({collection: 'col', dataset: 'ds', items, table: 'tbl'});
      expect(mockAppendRows).toHaveBeenCalledWith(items);
      expect(mockCreateStreamConnection).toHaveBeenCalledWith(
        expect.objectContaining({
          destinationTable: expect.stringContaining('ds'),
        }),
      );
      expect(mockCreateStreamConnection).toHaveBeenCalledWith(
        expect.objectContaining({
          destinationTable: expect.stringContaining('tbl'),
        }),
      );
    });

    it('does not call Firestore batch when update is false', async () => {
      const items = [{id: 'a'}];
      await backup({collection: 'col', dataset: 'ds', items, table: 'tbl', update: false});
      expect(mockBatch).not.toHaveBeenCalled();
    });
  });

  describe('with update flag', () => {
    it('calls batch.update for each item when update is true', async () => {
      const items = [{id: 'doc1'}, {id: 'doc2'}];
      await backup({collection: 'col', dataset: 'ds', items, table: 'tbl', update: true});
      expect(mockBatchUpdate).toHaveBeenCalledTimes(2);
    });

    it('calls batch.delete for each item when delete is true', async () => {
      const items = [{id: 'doc1'}, {id: 'doc2'}];
      await backup({
        collection: 'col',
        dataset: 'ds',
        items,
        table: 'tbl',
        update: true,
        delete: true,
      });
      expect(mockBatchDelete).toHaveBeenCalledTimes(2);
    });

    it('skips items without an id during the update pass', async () => {
      const items = [{id: 'doc1'}, {value: 'no-id'}, {id: 'doc3'}];
      await backup({collection: 'col', dataset: 'ds', items, table: 'tbl', update: true});
      expect(mockBatchUpdate).toHaveBeenCalledTimes(2);
    });
  });

  describe('BigQuery error handling', () => {
    it('re-throws when BigQuery Storage write fails', async () => {
      mockGetResult.mockRejectedValue(new Error('BQ error'));
      await expect(
        backup({collection: 'col', dataset: 'ds', items: [{id: 'x'}], table: 'tbl'}),
      ).rejects.toBeTruthy();
    });
  });
});
