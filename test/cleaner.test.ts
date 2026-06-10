/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import {beforeEach, describe, expect, it, vi} from 'vitest';

// ---------- BigQuery mock (vi.hoisted avoids TDZ with vi.mock hoisting) ----------
const {mockGetQueryResults, mockCreateQueryJob} = vi.hoisted(() => {
  const mockGetQueryResults = vi.fn().mockResolvedValue([[]]);
  const mockJob = {getQueryResults: mockGetQueryResults};
  const mockCreateQueryJob = vi.fn().mockResolvedValue([mockJob]);
  return {mockGetQueryResults, mockCreateQueryJob};
});

vi.mock('@google-cloud/bigquery', () => ({
  BigQuery: vi.fn(() => ({
    createQueryJob: mockCreateQueryJob,
  })),
}));

// ---------- Firebase Functions logger mock ----------
vi.mock('firebase-functions/v2', () => ({
  logger: {info: vi.fn(), warn: vi.fn(), error: vi.fn(), log: vi.fn()},
}));

import cleaner from '../src/cleaner.js';

describe('cleaner', () => {
  describe('query builder (via exported default)', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      const mockJob = {getQueryResults: mockGetQueryResults};
      mockGetQueryResults.mockResolvedValue([[]]);
      mockCreateQueryJob.mockResolvedValue([mockJob]);
    });

    it('throws when dataset is missing', async () => {
      await expect(
        cleaner({dataset: '', table: 'tbl', timestamp: 'ts'}),
      ).rejects.toThrow('Dataset or Table not defined');
    });

    it('submits a query job to BigQuery', async () => {
      await cleaner({dataset: 'myDataset', table: 'myTable', timestamp: 'updatedAt'});
      expect(mockCreateQueryJob).toHaveBeenCalledOnce();
    });

    it('includes the dataset and table in the generated SQL', async () => {
      await cleaner({dataset: 'myDataset', table: 'myTable', timestamp: 'updatedAt'});
      const call = mockCreateQueryJob.mock.calls[0][0];
      expect(call.query).toContain('myDataset.myTable');
    });

    it('includes the timestamp column in the generated SQL', async () => {
      await cleaner({dataset: 'ds', table: 'tbl', timestamp: 'created_at'});
      const call = mockCreateQueryJob.mock.calls[0][0];
      expect(call.query).toContain('created_at');
    });

    it('includes the optional column in the generated SQL when provided', async () => {
      await cleaner({dataset: 'ds', table: 'tbl', timestamp: 'ts', column: 'region'});
      const call = mockCreateQueryJob.mock.calls[0][0];
      expect(call.query).toContain('region');
    });

    it('does not include an extra column when omitted', async () => {
      await cleaner({dataset: 'ds', table: 'tbl', timestamp: 'ts'});
      const call = mockCreateQueryJob.mock.calls[0][0];
      expect(call.query).not.toContain('undefined');
    });

    it('resolves silently when BigQuery job fails', async () => {
      mockCreateQueryJob.mockRejectedValue(new Error('quota exceeded'));
      await expect(
        cleaner({dataset: 'ds', table: 'tbl', timestamp: 'ts'}),
      ).resolves.toBeUndefined();
    });
  });
});
