/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import {beforeEach, describe, expect, it, vi} from 'vitest';
import type {DocumentData} from 'firebase-admin/firestore';

// ---------- Firestore mock helpers ----------
let mockDocExists = true;
let mockDocData: DocumentData = {name: 'Alice', age: 30};
let mockDocId = 'doc123';
let mockQueryEmpty = false;

const mockRefGet = vi.fn();
const mockDocRef = {get: mockRefGet, id: mockDocId, path: 'users/doc123'};
const mockCountGet = vi.fn();
const mockCount = vi.fn(() => ({get: mockCountGet}));
const mockLimit = vi.fn();
const mockWhere = vi.fn();
const mockOrderBy = vi.fn();
const mockQueryGet = vi.fn();
const mockCollectionGroup = vi.fn();
const mockCollection = vi.fn();

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => ({
    collection: mockCollection,
    collectionGroup: mockCollectionGroup,
  })),
}));

import {FirestoreHelper} from '../src/firestore-helper.js';

describe('FirestoreHelper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDocExists = true;
    mockDocData = {name: 'Alice', age: 30};
    mockDocId = 'doc123';
    mockQueryEmpty = false;

    // Set up chainable query builder
    const queryRef = {
      orderBy: mockOrderBy,
      where: mockWhere,
      limit: mockLimit,
      get: mockQueryGet,
      count: mockCount,
    };
    mockOrderBy.mockReturnValue(queryRef);
    mockWhere.mockReturnValue(queryRef);
    mockLimit.mockReturnValue(queryRef);

    // Firestore document get
    mockRefGet.mockResolvedValue({
      exists: mockDocExists,
      id: mockDocId,
      data: () => mockDocData,
    });

    const mockDocFn = vi.fn(() => ({...mockDocRef, get: mockRefGet}));
    mockCollection.mockReturnValue({...queryRef, doc: mockDocFn});
    mockCollectionGroup.mockReturnValue(queryRef);

    // Query snapshot
    mockQueryGet.mockResolvedValue({
      empty: mockQueryEmpty,
      docs: [
        {id: 'doc1', ref: mockDocRef, data: () => ({val: 1})},
        {id: 'doc2', ref: mockDocRef, data: () => ({val: 2})},
      ],
    });

    mockCountGet.mockResolvedValue({
      data: () => ({count: 2}),
    });
  });

  describe('getListReference', () => {
    it('throws when neither collection nor collectionGroup is provided', () => {
      expect(() => FirestoreHelper.Helper.getListReference({})).toThrow(
        'collection or collectionGroup is required',
      );
    });

    it('returns a query reference for a collection', () => {
      const ref = FirestoreHelper.Helper.getListReference({collection: 'users'});
      expect(ref).toBeDefined();
    });

    it('applies orderBy clauses', () => {
      FirestoreHelper.Helper.getListReference({
        collection: 'users',
        orderBy: [{key: 'name', direction: 'asc'}],
      });
      expect(mockOrderBy).toHaveBeenCalledWith('name', 'asc');
    });

    it('applies where clauses', () => {
      FirestoreHelper.Helper.getListReference({
        collection: 'users',
        where: [{field: 'active', operator: '==', value: true}],
      });
      expect(mockWhere).toHaveBeenCalledWith('active', '==', true);
    });

    it('applies limit', () => {
      FirestoreHelper.Helper.getListReference({collection: 'users', limit: 5});
      expect(mockLimit).toHaveBeenCalledWith(5);
    });
  });

  describe('getListIds', () => {
    it('returns an array of document IDs', async () => {
      const ids = await FirestoreHelper.Helper.getListIds({collection: 'users'});
      expect(ids).toEqual(['doc1', 'doc2']);
    });

    it('returns empty array when snapshot is empty', async () => {
      mockQueryGet.mockResolvedValueOnce({empty: true, docs: []});
      const ids = await FirestoreHelper.Helper.getListIds({collection: 'users'});
      expect(ids).toEqual([]);
    });
  });

  describe('getListRef', () => {
    it('returns an array of DocumentReferences', async () => {
      const refs = await FirestoreHelper.Helper.getListRef({collection: 'users'});
      expect(refs).toHaveLength(2);
      expect(refs[0]).toBe(mockDocRef);
    });
  });

  describe('count', () => {
    it('returns the count from the aggregation snapshot', async () => {
      const n = await FirestoreHelper.Helper.count({collection: 'users'});
      expect(n).toBe(2);
    });

    it('returns 0 when count snapshot is null', async () => {
      mockCountGet.mockResolvedValueOnce(null);
      const n = await FirestoreHelper.Helper.count({collection: 'users'});
      expect(n).toBe(0);
    });
  });

  describe('exists', () => {
    it('returns true when the document exists', async () => {
      mockRefGet.mockResolvedValueOnce({
        exists: true,
        id: 'doc123',
        data: () => mockDocData,
      });
      const result = await FirestoreHelper.Helper.exists({
        collection: 'users',
        document: 'doc123',
      });
      expect(result).toBe(true);
    });

    it('returns false when the document does not exist', async () => {
      mockRefGet.mockResolvedValueOnce({exists: false, id: '', data: () => ({})});
      const result = await FirestoreHelper.Helper.exists({
        collection: 'users',
        document: 'missing',
      });
      expect(result).toBe(false);
    });
  });

  describe('getDocument', () => {
    it('returns document data merged with id', async () => {
      mockRefGet.mockResolvedValueOnce({
        exists: true,
        id: 'doc123',
        data: () => ({name: 'Alice'}),
      });
      const data = await FirestoreHelper.Helper.getDocument({
        collection: 'users',
        document: 'doc123',
      });
      expect(data.id).toBe('doc123');
      expect(data.name).toBe('Alice');
    });

    it('throws when the document does not exist', async () => {
      mockRefGet.mockResolvedValueOnce({exists: false, id: '', data: () => ({})});
      await expect(
        FirestoreHelper.Helper.getDocument({collection: 'users', document: 'missing'}),
      ).rejects.toThrow('Not found');
    });

    it('throws when collection is missing', async () => {
      await expect(
        FirestoreHelper.Helper.getDocument({document: 'doc123'}),
      ).rejects.toThrow('Missing collection');
    });

    it('throws when document is missing', async () => {
      await expect(
        FirestoreHelper.Helper.getDocument({collection: 'users'}),
      ).rejects.toThrow('Missing document id');
    });
  });
});
