/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import {beforeEach, describe, expect, it, vi} from 'vitest';

const {
  mockGetUsers,
  mockCreateUser,
  mockGetUser,
  mockSetCustomUserClaims,
  mockRevokeRefreshTokens,
  mockUpdateUser,
  mockSet,
  mockDoc,
  mockCollection,
  mockGetDocument,
} = vi.hoisted(() => ({
  mockGetUsers: vi.fn(),
  mockCreateUser: vi.fn(),
  mockGetUser: vi.fn(),
  mockSetCustomUserClaims: vi.fn(),
  mockRevokeRefreshTokens: vi.fn(),
  mockUpdateUser: vi.fn(),
  mockSet: vi.fn(),
  mockDoc: vi.fn(),
  mockCollection: vi.fn(),
  mockGetDocument: vi.fn(),
}));

vi.mock('firebase-admin/auth', () => ({
  getAuth: vi.fn(() => ({
    getUsers: mockGetUsers,
    createUser: mockCreateUser,
    getUser: mockGetUser,
    updateUser: mockUpdateUser,
    setCustomUserClaims: mockSetCustomUserClaims,
    revokeRefreshTokens: mockRevokeRefreshTokens,
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

  it('drops billing and provider identity fields', () => {
    const result = User.Helper.sanitizeProfile({
      firstName: 'Ada',
      // Only a server-side call to the payment provider knows these values.
      bcId: 'cus_somebody_else',
      bsId: 'sub_somebody_else',
      bsiId: 'si_somebody_else',
      bst: 1234567890,
      but: 1234567890,
      buq: 0,
    });
    // Positive control: the legitimate field survived, so the filter ran.
    expect(result).toEqual({firstName: 'Ada'});
  });

  it('drops the account tenancy pointer', () => {
    const result = User.Helper.sanitizeProfile({firstName: 'Ada', account: 'tenant-they-do-not-own'});
    expect(result).toEqual({firstName: 'Ada'});
  });

  it('keeps ads, which holds the user\'s own placement identifiers', () => {
    const ads = {adsense: {client: 'ca-pub-0000000000000000', slot: '1234567890'}};
    expect(User.Helper.sanitizeProfile({ads})).toEqual({ads});
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

  it('never lists a billing, provider identity or tenancy field as creatable', () => {
    for (const reserved of ['account', 'bcId', 'bsId', 'bsiId', 'bst', 'but', 'buq']) {
      expect(User.creatableProfileFields).not.toContain(reserved);
    }
  });

  it('keeps the creatable and server-only lists disjoint', () => {
    const overlap = User.creatableProfileFields.filter((field) => User.serverOnlyFields.includes(field));
    expect(overlap).toEqual([]);
    // Positive control: both lists are actually populated, so the intersection above
    // is empty because the lists are disjoint and not because one of them is empty.
    expect(User.creatableProfileFields.length).toBeGreaterThan(0);
    expect(User.serverOnlyFields.length).toBeGreaterThan(0);
  });

  it('drops every server-only field while keeping a legitimate one', () => {
    const injected: Record<string, unknown> = {firstName: 'Ada'};
    for (const field of User.serverOnlyFields) injected[field] = 'injected';
    const result = User.Helper.sanitizeProfile(injected);
    // Positive control first: the legitimate field really did survive.
    expect(result.firstName).toBe('Ada');
    expect(Object.keys(result)).toEqual(['firstName']);
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

  it('does not write caller-supplied billing identity or the account pointer', async () => {
    await User.Helper.create({
      email: 'mallory@example.com',
      firstName: 'Mal',
      lastName: 'Lory',
      language: 'en',
      bcId: 'cus_somebody_else',
      bsId: 'sub_somebody_else',
      bsiId: 'si_somebody_else',
      bst: 1234567890,
      but: 1234567890,
      buq: 0,
      account: 'tenant-they-do-not-own',
    });

    const document = writtenDocument();
    // Positive control: the write happened and legitimate fields landed, so the
    // absences below are real rather than the result of a skipped write.
    expect(mockCreateUser).toHaveBeenCalledTimes(1);
    expect(document.name).toBe('Mal Lory');
    expect(document.language).toBe('en');
    // Negative path.
    for (const field of ['bcId', 'bsId', 'bsiId', 'bst', 'but', 'buq', 'account']) {
      expect(Object.prototype.hasOwnProperty.call(document, field)).toBe(false);
    }
  });
});

describe('User.Helper role changes — custom claims and token revocation', () => {
  /**
   * Returns the claims object handed to the most recent `setCustomUserClaims` call.
   *
   * @returns {object} The published custom claims.
   */
  const publishedClaims = (): {role?: string, groups?: Record<string, string>} => {
    expect(mockSetCustomUserClaims).toHaveBeenCalled();
    return mockSetCustomUserClaims.mock.calls[mockSetCustomUserClaims.mock.calls.length - 1][1];
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSet.mockResolvedValue(undefined);
    mockDoc.mockReturnValue({set: mockSet, delete: vi.fn().mockResolvedValue(undefined)});
    mockCollection.mockReturnValue({doc: mockDoc});
    mockSetCustomUserClaims.mockResolvedValue(undefined);
    mockRevokeRefreshTokens.mockResolvedValue(undefined);
    mockUpdateUser.mockResolvedValue(undefined);
    mockGetUser.mockResolvedValue({
      uid: 'uid-1',
      email: 'ada@example.com',
      phoneNumber: null,
      customClaims: {groups: {'tenant-a': 'admin'}},
    });
    mockGetDocument.mockResolvedValue({id: 'uid-1', groups: {'tenant-a': 'admin'}});
  });

  it('removes the group from published claims rather than republishing a stale map', async () => {
    await User.Helper.remove({id: 'uid-1', group: 'tenant-a'});
    const claims = publishedClaims();
    // Positive control: claims really were published on this path.
    expect(mockSetCustomUserClaims).toHaveBeenCalledTimes(1);
    expect(claims.groups).toBeDefined();
    // The removed group must not survive into the signed token.
    expect(claims.groups['tenant-a']).toBeUndefined();
  });

  it('revokes refresh tokens when a group role is withdrawn', async () => {
    await User.Helper.remove({id: 'uid-1', group: 'tenant-a'});
    expect(mockRevokeRefreshTokens).toHaveBeenCalledWith('uid-1');
  });

  it('revokes refresh tokens when an existing role is replaced', async () => {
    await User.Helper.updateRole({id: 'uid-1', group: 'tenant-a', role: 'viewer'}, 'https://example.com');
    // Positive control: the replacement really was published.
    expect(publishedClaims().groups['tenant-a']).toBe('viewer');
    expect(mockRevokeRefreshTokens).toHaveBeenCalledWith('uid-1');
  });

  it('revokes refresh tokens on a pure grant of a group the user did not hold', async () => {
    await User.Helper.updateRole({id: 'uid-1', group: 'tenant-b', role: 'admin'}, 'https://example.com');
    // Positive control: the grant was published.
    expect(publishedClaims().groups['tenant-b']).toBe('admin');
    expect(mockRevokeRefreshTokens).toHaveBeenCalledWith('uid-1');
  });

  it('preserves other group memberships when one is removed', async () => {
    mockGetDocument.mockResolvedValue({id: 'uid-1', groups: {'tenant-a': 'admin', 'tenant-b': 'viewer'}});
    await User.Helper.remove({id: 'uid-1', group: 'tenant-a'});
    const claims = publishedClaims();
    expect(claims.groups['tenant-b']).toBe('viewer');
    expect(claims.groups['tenant-a']).toBeUndefined();
  });

  it('publishes a group claim on the first grant, when the document has no groups yet', async () => {
    mockGetUser.mockResolvedValue({uid: 'uid-1', email: 'ada@example.com', phoneNumber: null, customClaims: {}});
    mockGetDocument.mockResolvedValue({id: 'uid-1'});
    await User.Helper.updateRole({id: 'uid-1', group: 'tenant-a', role: 'admin'}, 'https://example.com');
    expect(publishedClaims().groups).toEqual({'tenant-a': 'admin'});
    expect(mockRevokeRefreshTokens).toHaveBeenCalledWith('uid-1');
  });

  it('revokes refresh tokens when a new group grant is the first entry (pure grant)', async () => {
    mockGetUser.mockResolvedValue({uid: 'uid-1', email: 'ada@example.com', phoneNumber: null, customClaims: {}});
    mockGetDocument.mockResolvedValue({id: 'uid-1'});
    await User.Helper.updateRole({id: 'uid-1', group: 'tenant-b', role: 'editor'}, 'https://example.com');
    expect(publishedClaims().groups['tenant-b']).toBe('editor');
    expect(mockRevokeRefreshTokens).toHaveBeenCalledWith('uid-1');
  });

  it('revokes refresh tokens when an existing group role value is changed', async () => {
    // tenant-a is already admin; changing it to viewer is a replacement.
    await User.Helper.updateRole({id: 'uid-1', group: 'tenant-a', role: 'viewer'}, 'https://example.com');
    expect(publishedClaims().groups['tenant-a']).toBe('viewer');
    expect(mockRevokeRefreshTokens).toHaveBeenCalledWith('uid-1');
  });

  it('revokes refresh tokens when a group is removed', async () => {
    await User.Helper.remove({id: 'uid-1', group: 'tenant-a'});
    expect(mockRevokeRefreshTokens).toHaveBeenCalledWith('uid-1');
  });

  it('revokes refresh tokens when a top-level role is set', async () => {
    mockGetUser.mockResolvedValue({uid: 'uid-1', email: 'ada@example.com', phoneNumber: null, customClaims: {}});
    mockGetDocument.mockResolvedValue({id: 'uid-1'});
    await User.Helper.updateRole({id: 'uid-1', role: 'admin'}, 'https://example.com');
    expect(publishedClaims().role).toBe('admin');
    expect(mockRevokeRefreshTokens).toHaveBeenCalledWith('uid-1');
  });

  it('throws and does not call setCustomUserClaims when the claims payload exceeds 1000 bytes', async () => {
    // Build a groups map large enough that JSON.stringify exceeds 1000 bytes.
    // Each entry ~30-40 bytes; 40 entries is well over the limit.
    const largeGroups: Record<string, string> = {};
    for (let i = 0; i < 40; i++) {
      largeGroups[`tenant-group-${String(i).padStart(3, '0')}`] = 'admin';
    }
    mockGetUser.mockResolvedValue({
      uid: 'uid-1',
      email: 'ada@example.com',
      phoneNumber: null,
      customClaims: {groups: largeGroups},
    });
    mockGetDocument.mockResolvedValue({id: 'uid-1', groups: largeGroups});
    await expect(
      User.Helper.updateRole({id: 'uid-1', group: 'tenant-group-new', role: 'editor'}, 'https://example.com'),
    ).rejects.toThrow(/exceeds the Firebase limit/);
    expect(mockSetCustomUserClaims).not.toHaveBeenCalled();
  });
});
