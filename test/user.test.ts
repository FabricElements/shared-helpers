/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import {beforeEach, describe, expect, it, vi} from 'vitest';

const {
  mockGetUsers,
  mockCreateUser,
  mockSet,
  mockDoc,
  mockCollection,
  mockGetDocument,
} = vi.hoisted(() => ({
  mockGetUsers: vi.fn(),
  mockCreateUser: vi.fn(),
  mockSet: vi.fn(),
  mockDoc: vi.fn(),
  mockCollection: vi.fn(),
  mockGetDocument: vi.fn(),
}));

vi.mock('firebase-admin/auth', () => ({
  getAuth: vi.fn(() => ({
    getUsers: mockGetUsers,
    createUser: mockCreateUser,
    getUser: vi.fn(),
    updateUser: vi.fn(),
    setCustomUserClaims: vi.fn(),
  })),
  UserRecord: class UserRecord {},
}));

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => ({collection: mockCollection})),
  FieldValue: {
    serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP'),
    delete: vi.fn(() => 'DELETE_SENTINEL'),
  },
}));

vi.mock('firebase-functions/v2', () => ({
  logger: {info: vi.fn(), warn: vi.fn(), error: vi.fn(), log: vi.fn()},
  https: {HttpsError: class HttpsError extends Error {}},
}));

vi.mock('../src/media.js', () => ({
  Media: {Helper: {saveFromUrl: vi.fn(), save: vi.fn()}},
}));

vi.mock('../src/firestore-helper.js', () => ({
  FirestoreHelper: {Helper: {getDocument: mockGetDocument}},
}));

import {User} from '../src/user.js';

/**
 * Returns the data object handed to the Firestore `set` call that wrote the
 * `user/{uid}` document, i.e. the payload that actually reached the database.
 *
 * @returns {Record<string, unknown>} The written document payload.
 */
const writtenDocument = (): Record<string, unknown> => {
  expect(mockSet).toHaveBeenCalled();
  return mockSet.mock.calls[mockSet.mock.calls.length - 1][0] as Record<string, unknown>;
};

describe('User.Helper.sanitizeProfile', () => {
  it('keeps every allow-listed profile field', () => {
    const result = User.Helper.sanitizeProfile({
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      language: 'en',
      country: 'GB',
      links: {website: 'https://example.com'},
    });
    expect(result).toEqual({
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      language: 'en',
      country: 'GB',
      links: {website: 'https://example.com'},
    });
  });

  it('drops authorization fields, credentials and unknown keys', () => {
    const result = User.Helper.sanitizeProfile({
      firstName: 'Ada',
      role: 'admin',
      group: 'tenant-a',
      groups: {'tenant-a': 'owner'},
      password: 'hunter2',
      somethingNobodyAnticipated: true,
    });
    expect(result).toEqual({firstName: 'Ada'});
  });

  it('ignores inherited properties and undefined values', () => {
    const inherited = Object.create({groups: {'tenant-a': 'owner'}});
    inherited.firstName = 'Ada';
    inherited.lastName = undefined;
    const result = User.Helper.sanitizeProfile(inherited);
    expect(result).toEqual({firstName: 'Ada'});
    expect(Object.prototype.hasOwnProperty.call(result, 'lastName')).toBe(false);
  });

  it('returns an empty object for nullish input', () => {
    expect(User.Helper.sanitizeProfile(null)).toEqual({});
    expect(User.Helper.sanitizeProfile(undefined)).toEqual({});
  });

  it('never lists an authorization field as creatable', () => {
    for (const reserved of ['role', 'group', 'groups', 'password', 'id', 'created', 'updated', 'ping', 'backup']) {
      expect(User.creatableProfileFields).not.toContain(reserved);
    }
  });
});

describe('User.Helper.create — caller-supplied authorization fields', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSet.mockResolvedValue(undefined);
    mockDoc.mockReturnValue({set: mockSet});
    mockCollection.mockReturnValue({doc: mockDoc});
    // No existing Auth user, so `create` takes the `createUser` path.
    mockGetUsers.mockResolvedValue({users: []});
    mockCreateUser.mockResolvedValue({uid: 'new-uid'});
  });

  it('does not write a caller-supplied nested authorization map', async () => {
    await User.Helper.create({
      email: 'ada@example.com',
      firstName: 'Ada',
      lastName: 'Lovelace',
      // Injected by an attacker through an unvalidated request body.
      groups: {'tenant-they-do-not-own': 'owner'},
      role: 'admin',
      group: 'tenant-they-do-not-own',
      password: 'hunter2',
    });

    const document = writtenDocument();
    // Positive control: the legitimate write really happened and was not skipped,
    // so the assertions below are not passing vacuously.
    expect(mockCreateUser).toHaveBeenCalledTimes(1);
    expect(mockCollection).toHaveBeenCalledWith('user');
    expect(mockDoc).toHaveBeenCalledWith('new-uid');
    expect(document.firstName).toBe('Ada');
    expect(document.lastName).toBe('Lovelace');
    expect(document.name).toBe('Ada Lovelace');
    expect(document.abbr).toBe('AL');
    expect(document.email).toBe('ada@example.com');

    // Negative path: nothing privilege-bearing survived.
    expect(document.groups).toBeUndefined();
    expect(Object.prototype.hasOwnProperty.call(document, 'groups')).toBe(false);
    expect(document.group).toBeUndefined();
    expect(document.password).toBeUndefined();
    expect(document.role).toBe('user');
  });

  it('drops undeclared keys while persisting declared profile fields', async () => {
    await User.Helper.create({
      phone: '+15551234567',
      firstName: 'Grace',
      lastName: 'Hopper',
      language: 'en',
      country: 'US',
      links: {website: 'https://example.com'},
      permissions: {billing: 'write'},
      isAdmin: true,
    });

    const document = writtenDocument();
    // Positive control.
    expect(document.language).toBe('en');
    expect(document.country).toBe('US');
    expect(document.links).toEqual({website: 'https://example.com'});
    // Negative path.
    expect(document.permissions).toBeUndefined();
    expect(document.isAdmin).toBeUndefined();
  });

  it('assigns the server-side role even when the caller sends one', async () => {
    await User.Helper.create({
      email: 'mallory@example.com',
      firstName: 'Mal',
      lastName: 'Lory',
      role: 'owner',
    });
    expect(writtenDocument().role).toBe('user');
  });
});
