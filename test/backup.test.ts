/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import {beforeEach, describe, expect, it, vi} from 'vitest';

// ---------- BigQuery mock ----------
const mockInsert = vi.fn();
const mockTable = vi.fn(() => ({insert: mockInsert}));
const mockDataset = vi.fn(() => ({table: mockTable}));

vi.mock('@google-cloud/bigquery', () => ({
  BigQuery: vi.fn(() => ({
    dataset: mockDataset,
  })),
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
    mockInsert.mockResolvedValue(undefined);
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
        backup({collection: 'col', dataset: 'ds', items: null as any, table: 'tbl'}),
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
      expect(mockInsert).not.toHaveBeenCalled();
    });
  });

  describe('successful BigQuery insert without Firestore update', () => {
    it('calls BigQuery insert with the items', async () => {
      const items = [{id: 'a', value: 1}, {id: 'b', value: 2}];
      await backup({collection: 'col', dataset: 'ds', items, table: 'tbl'});
      expect(mockInsert).toHaveBeenCalledWith(items, {
        ignoreUnknownValues: true,
        skipInvalidRows: true,
      });
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
    it('re-throws when BigQuery insert fails', async () => {
      mockInsert.mockRejectedValue(new Error('BQ error'));
      await expect(
        backup({collection: 'col', dataset: 'ds', items: [{id: 'x'}], table: 'tbl'}),
      ).rejects.toBeTruthy();
    });
  });
});
