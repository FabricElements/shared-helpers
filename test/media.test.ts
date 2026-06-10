/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import {beforeAll, describe, expect, it, vi} from 'vitest';

// Break the media ↔ regex circular dependency by mocking regex before media loads.
vi.mock('../src/regex.js', () => ({
  isEmail: /email/,
  contentTypeIsImageForSharp: /^(image\/)(jpeg|png|webp|gif)/,
  contentTypeIsJPEG: /^(image\/)(jpeg|jpg)/,
  isImage: /^(image\/)/,
  isMedia: /^(application\/pdf|image|audio|video|text\/)/,
}));

vi.mock('sharp', () => {
  const sharpInstance = {
    resize: vi.fn().mockReturnThis(),
    extract: vi.fn().mockReturnThis(),
    withMetadata: vi.fn().mockReturnThis(),
    toFormat: vi.fn().mockReturnThis(),
    toBuffer: vi.fn().mockResolvedValue(Buffer.from('fakeimage')),
  };
  const sharp = vi.fn(() => sharpInstance);
  Object.assign(sharp, {strategy: {attention: 'attention', entropy: 'entropy'}});
  Object.assign(sharp, {fit: {cover: 'cover', inside: 'inside'}});
  return {default: sharp};
});

vi.mock('firebase-admin/storage', () => ({
  getStorage: vi.fn(() => ({
    bucket: vi.fn(() => ({
      file: vi.fn(() => ({
        save: vi.fn().mockResolvedValue(undefined),
        exists: vi.fn().mockResolvedValue([true]),
        getMetadata: vi.fn().mockResolvedValue([{contentType: 'image/jpeg', size: 5000}]),
        download: vi.fn().mockResolvedValue([Buffer.from('fakeimage')]),
      })),
    })),
  })),
}));

vi.mock('firebase-functions/v2', () => ({
  logger: {info: vi.fn(), warn: vi.fn(), error: vi.fn(), log: vi.fn()},
  https: {HttpsError: class HttpsError extends Error {}},
}));

vi.mock('node-fetch', () => ({default: vi.fn()}));

describe('Media namespace', () => {
  let Media: typeof import('../src/media.js').Media;

  beforeAll(async () => {
    const mod = await import('../src/media.js');
    Media = mod.Media;
  });

  describe('AvailableOutputFormats enum', () => {
    it('contains jpeg', () => {
      expect(Media.AvailableOutputFormats.jpeg).toBe('jpeg');
    });

    it('contains png', () => {
      expect(Media.AvailableOutputFormats.png).toBe('png');
    });

    it('contains webp', () => {
      expect(Media.AvailableOutputFormats.webp).toBe('webp');
    });
  });

  describe('ImageSize enum', () => {
    it('contains all expected size keys', () => {
      const sizes = ['thumbnail', 'small', 'medium', 'standard', 'high', 'max'];
      for (const size of sizes) {
        expect(Media.ImageSize[size as keyof typeof Media.ImageSize]).toBe(size);
      }
    });
  });

  describe('Image.sizeObjectFromImageSize', () => {
    it('returns correct dimensions for standard', () => {
      const result = Media.Image.sizeObjectFromImageSize(Media.ImageSize.standard);
      expect(result.size).toBe(Media.ImageSize.standard);
      expect(typeof result.height).toBe('number');
      expect(typeof result.width).toBe('number');
    });

    it('returns correct dimensions for thumbnail', () => {
      const result = Media.Image.sizeObjectFromImageSize(Media.ImageSize.thumbnail);
      expect(result.size).toBe(Media.ImageSize.thumbnail);
      expect(result.height).toBe(200);
      expect(result.width).toBe(400);
    });

    it('falls back to standard for an unrecognised size', () => {
      const result = Media.Image.sizeObjectFromImageSize('unknown' as Media.ImageSize);
      expect(result.size).toBe(Media.ImageSize.standard);
    });
  });

  describe('Image.bufferImage', () => {
    it('returns a buffer and contentType', async () => {
      const fakeBuffer = Buffer.from('test-image-data');
      const result = await Media.Image.bufferImage({
        input: fakeBuffer,
        maxWidth: 200,
        maxHeight: 200,
        format: Media.AvailableOutputFormats.jpeg,
        quality: 80,
      });
      expect(result).toHaveProperty('buffer');
      expect(result).toHaveProperty('contentType');
      expect(result.contentType).toContain('image/');
    });
  });
});
