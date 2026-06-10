/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import {beforeAll, describe, expect, it, vi} from 'vitest';

vi.mock('sharp', () => {
  const sharp = vi.fn(() => ({
    resize: vi.fn().mockReturnThis(),
    extract: vi.fn().mockReturnThis(),
    withMetadata: vi.fn().mockReturnThis(),
    toFormat: vi.fn().mockReturnThis(),
    toBuffer: vi.fn().mockResolvedValue(Buffer.from('fakeimage')),
  }));
  Object.assign(sharp, {strategy: {attention: 'attention', entropy: 'entropy'}});
  Object.assign(sharp, {fit: {cover: 'cover', inside: 'inside'}});
  return {default: sharp};
});

vi.mock('firebase-admin/storage', () => ({
  getStorage: vi.fn(),
}));

vi.mock('firebase-functions/v2', () => ({
  logger: {info: vi.fn(), warn: vi.fn(), error: vi.fn(), log: vi.fn()},
}));

vi.mock('node-fetch', () => ({default: vi.fn()}));

describe('regex', () => {
  let isEmail: RegExp;
  let contentTypeIsImageForSharp: RegExp;
  let contentTypeIsJPEG: RegExp;
  let isImage: RegExp;
  let isMedia: RegExp;

  beforeAll(async () => {
    const mod = await import('../src/regex.js');
    isEmail = mod.isEmail;
    contentTypeIsImageForSharp = mod.contentTypeIsImageForSharp;
    contentTypeIsJPEG = mod.contentTypeIsJPEG;
    isImage = mod.isImage;
    isMedia = mod.isMedia;
  });

  describe('isEmail', () => {
    it('matches a standard email address', () => {
      expect(isEmail.test('user@example.com')).toBe(true);
    });

    it('matches email with subdomain', () => {
      expect(isEmail.test('user@mail.example.com')).toBe(true);
    });

    it('does not match a string without @', () => {
      expect(isEmail.test('notanemail')).toBe(false);
    });

    it('does not match a string with only @', () => {
      expect(isEmail.test('@')).toBe(false);
    });
  });

  describe('contentTypeIsImageForSharp', () => {
    it('matches image/jpeg', () => {
      expect(contentTypeIsImageForSharp.test('image/jpeg')).toBe(true);
    });

    it('matches image/png', () => {
      expect(contentTypeIsImageForSharp.test('image/png')).toBe(true);
    });

    it('does not match application/json', () => {
      expect(contentTypeIsImageForSharp.test('application/json')).toBe(false);
    });

    it('does not match video/mp4', () => {
      expect(contentTypeIsImageForSharp.test('video/mp4')).toBe(false);
    });
  });

  describe('contentTypeIsJPEG', () => {
    it('matches image/jpeg', () => {
      expect(contentTypeIsJPEG.test('image/jpeg')).toBe(true);
    });

    it('matches image/jpg', () => {
      expect(contentTypeIsJPEG.test('image/jpg')).toBe(true);
    });

    it('does not match image/png', () => {
      expect(contentTypeIsJPEG.test('image/png')).toBe(false);
    });
  });

  describe('isImage', () => {
    it('matches image/gif', () => {
      expect(isImage.test('image/gif')).toBe(true);
    });

    it('matches image/jpeg', () => {
      expect(isImage.test('image/jpeg')).toBe(true);
    });

    it('does not match application/pdf', () => {
      expect(isImage.test('application/pdf')).toBe(false);
    });
  });

  describe('isMedia', () => {
    it('matches application/pdf', () => {
      expect(isMedia.test('application/pdf')).toBe(true);
    });

    it('matches image/png', () => {
      expect(isMedia.test('image/png')).toBe(true);
    });

    it('matches audio/mpeg', () => {
      expect(isMedia.test('audio/mpeg')).toBe(true);
    });

    it('matches video/mp4', () => {
      expect(isMedia.test('video/mp4')).toBe(true);
    });

    it('matches text/plain', () => {
      expect(isMedia.test('text/plain')).toBe(true);
    });

    it('does not match application/json', () => {
      expect(isMedia.test('application/json')).toBe(false);
    });
  });
});
