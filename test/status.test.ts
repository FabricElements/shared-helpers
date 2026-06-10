/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import {beforeEach, describe, expect, it, vi} from 'vitest';

// ---------- Firestore mock ----------
const mockSet = vi.fn().mockResolvedValue(undefined);
const mockDoc = vi.fn(() => ({set: mockSet}));
const mockCollection = vi.fn(() => ({doc: mockDoc}));

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => ({collection: mockCollection})),
  FieldValue: {
    serverTimestamp: vi.fn().mockReturnValue('SERVER_TIMESTAMP'),
    increment: vi.fn((n: number) => `INCREMENT(${n})`),
    delete: vi.fn().mockReturnValue('DELETE'),
  },
}));

import {update} from '../src/status.js';

describe('status.update', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSet.mockResolvedValue(undefined);
  });

  it('throws when id is missing', async () => {
    await expect(update({status: 'active'})).rejects.toThrow('Missing input data');
  });

  it('throws when status is missing', async () => {
    await expect(update({id: 'doc1'})).rejects.toThrow('Missing input data');
  });

  it('throws when both id and status are missing', async () => {
    await expect(update({})).rejects.toThrow('Missing input data');
  });

  it('writes to the status collection with the correct document id', async () => {
    await update({id: 'user1', status: 'active'});
    expect(mockCollection).toHaveBeenCalledWith('status');
    expect(mockDoc).toHaveBeenCalledWith('user1');
  });

  it('calls set with merge: true', async () => {
    await update({id: 'user1', status: 'active'});
    expect(mockSet).toHaveBeenCalledWith(
      expect.any(Object),
      {merge: true},
    );
  });

  it('includes the status field in the written document', async () => {
    await update({id: 'u1', status: 'error'});
    const written = mockSet.mock.calls[0][0];
    expect(written.status).toBe('error');
  });

  it('includes optional description when provided', async () => {
    await update({id: 'u1', status: 'ok', description: 'All good'});
    const written = mockSet.mock.calls[0][0];
    expect(written.description).toBe('All good');
  });

  it('sets backup to false on every write', async () => {
    await update({id: 'u1', status: 'active'});
    const written = mockSet.mock.calls[0][0];
    expect(written.backup).toBe(false);
  });
});
