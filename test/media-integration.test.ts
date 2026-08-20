/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import sharp from 'sharp';
import {afterEach, beforeAll, beforeEach, describe, expect, it, vi} from 'vitest';

/**
 * Integration tests for the real `sharp` image pipeline.
 *
 * Unlike `test/media.test.ts`, this file deliberately does **not** mock `sharp`.
 * It drives `Media.Image.bufferImage` end to end against the real library and
 * asserts on metadata read back from the produced buffer, so a behavioural
 * regression in the pipeline (for example after a `sharp` upgrade) fails CI.
 */

// Break the media <-> regex circular dependency by mocking regex before media loads.
vi.mock('../src/regex.js', () => ({
  isEmail: /email/,
  contentTypeIsImageForSharp: /^(image\/)(jpeg|png|webp|gif)/,
  contentTypeIsJPEG: /^(image\/)(jpeg|jpg)/,
  isImage: /^(image\/)/,
  isMedia: /^(application\/pdf|image|audio|video|text\/)/,
}));

vi.mock('firebase-admin/storage', () => ({
  getStorage: vi.fn(() => ({
    bucket: vi.fn(() => ({
      file: vi.fn(() => ({
        save: vi.fn().mockResolvedValue(undefined),
        exists: vi.fn().mockResolvedValue([false]),
        getMetadata: vi.fn().mockResolvedValue([{contentType: 'image/jpeg', size: 5000}]),
        download: vi.fn().mockResolvedValue([Buffer.alloc(0)]),
      })),
    })),
  })),
}));

vi.mock('firebase-functions/v2', () => ({
  logger: {info: vi.fn(), warn: vi.fn(), error: vi.fn(), log: vi.fn()},
  https: {HttpsError: class HttpsError extends Error {}},
}));

// Ensure no test in this file can reach the network.
vi.stubGlobal('fetch', vi.fn(() => {
  throw new Error('Network access is not allowed in tests');
}));

/**
 * Builds an opaque single-colour PNG buffer of the requested dimensions.
 * @param {number} width - Image width in pixels.
 * @param {number} height - Image height in pixels.
 * @param {number} [tone] - Grey level applied to every channel (0-255).
 * @returns {Promise<Buffer>} A Promise resolving to the encoded PNG buffer.
 */
const createPng = async (width: number, height: number, tone = 120): Promise<Buffer> =>
  sharp(Buffer.alloc(width * height * 3, tone), {
    raw: {width, height, channels: 3},
  }).png().toBuffer();

/**
 * Builds a two-frame animated GIF buffer of the requested frame dimensions.
 * @param {number} width - Frame width in pixels.
 * @param {number} height - Frame height in pixels.
 * @returns {Promise<Buffer>} A Promise resolving to the encoded animated GIF buffer.
 */
const createAnimatedGif = async (width: number, height: number): Promise<Buffer> => {
  const frames = await Promise.all([
    createPng(width, height, 20),
    createPng(width, height, 220),
  ]);
  return sharp(frames, {join: {animated: true}}).gif({loop: 0}).toBuffer();
};

describe('Media.Image.bufferImage (real sharp integration)', () => {
  let Media: typeof import('../src/media.js').Media;
  let squarePng: Buffer;
  let widePng: Buffer;
  let animatedGif: Buffer;

  beforeAll(async () => {
    const mod = await import('../src/media.js');
    Media = mod.Media;
    // Fixtures are generated programmatically, never committed as binaries.
    squarePng = await createPng(128, 128);
    widePng = await createPng(128, 64);
    animatedGif = await createAnimatedGif(64, 64);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('format conversion', () => {
    it('produces a real JPEG at the requested width and density', async () => {
      // Arrange / Act
      const result = await Media.Image.bufferImage({
        input: squarePng,
        maxWidth: 32,
        format: Media.AvailableOutputFormats.jpeg,
        quality: 80,
      });
      const metadata = await sharp(result.buffer).metadata();
      // Assert
      expect(result.contentType).toBe('image/jpeg');
      expect(metadata.format).toBe('jpeg');
      expect(metadata.width).toBe(32);
      expect(metadata.height).toBe(32);
      expect(metadata.density).toBe(72);
    });

    it('produces a real PNG when the format is derived from contentType', async () => {
      // Arrange / Act
      const result = await Media.Image.bufferImage({
        input: squarePng,
        maxWidth: 64,
        contentType: 'image/png',
        quality: 90,
      });
      const metadata = await sharp(result.buffer).metadata();
      // Assert
      expect(result.contentType).toBe('image/png');
      expect(metadata.format).toBe('png');
      expect(metadata.width).toBe(64);
      expect(metadata.height).toBe(64);
      expect(metadata.density).toBe(72);
    });

    it('produces a real WebP at the requested width', async () => {
      // Arrange / Act
      const result = await Media.Image.bufferImage({
        input: squarePng,
        maxWidth: 48,
        format: Media.AvailableOutputFormats.webp,
        quality: 75,
      });
      const metadata = await sharp(result.buffer).metadata();
      // Assert
      expect(result.contentType).toBe('image/webp');
      expect(metadata.format).toBe('webp');
      expect(metadata.width).toBe(48);
      expect(metadata.height).toBe(48);
    });

    it('defaults to JPEG when neither format nor contentType is supplied', async () => {
      // Arrange / Act
      const result = await Media.Image.bufferImage({input: squarePng, maxWidth: 32});
      const metadata = await sharp(result.buffer).metadata();
      // Assert
      expect(result.contentType).toBe('image/jpeg');
      expect(metadata.format).toBe('jpeg');
    });

    it('lets an explicit format override the contentType-derived format', async () => {
      // Arrange / Act
      const result = await Media.Image.bufferImage({
        input: squarePng,
        maxWidth: 32,
        contentType: 'image/png',
        format: Media.AvailableOutputFormats.webp,
      });
      const metadata = await sharp(result.buffer).metadata();
      // Assert
      expect(result.contentType).toBe('image/webp');
      expect(metadata.format).toBe('webp');
    });
  });

  describe('animated GIF handling', () => {
    it('preserves every frame of an animated GIF while resizing each page', async () => {
      // Arrange
      const source = await sharp(animatedGif, {animated: true}).metadata();
      expect(source.pages).toBe(2);
      // Act
      const result = await Media.Image.bufferImage({
        input: animatedGif,
        maxWidth: 32,
        format: Media.AvailableOutputFormats.gif,
      });
      const metadata = await sharp(result.buffer, {animated: true}).metadata();
      // Assert
      expect(result.contentType).toBe('image/gif');
      expect(metadata.format).toBe('gif');
      expect(metadata.pages).toBe(2);
      expect(metadata.width).toBe(32);
      expect(metadata.pageHeight).toBe(32);
    });
  });

  describe('resize, crop and extract', () => {
    it('crops a wide image to an exact square via cover resize plus extract', async () => {
      // Arrange / Act
      const result = await Media.Image.bufferImage({
        input: widePng,
        maxWidth: 32,
        maxHeight: 32,
        format: Media.AvailableOutputFormats.png,
      });
      const metadata = await sharp(result.buffer).metadata();
      // Assert
      expect(metadata.format).toBe('png');
      expect(metadata.width).toBe(32);
      expect(metadata.height).toBe(32);
    });

    it('crops with the attention strategy to the requested dimensions', async () => {
      // Arrange / Act
      const result = await Media.Image.bufferImage({
        input: widePng,
        maxWidth: 40,
        maxHeight: 20,
        crop: 'attention',
        format: Media.AvailableOutputFormats.jpeg,
      });
      const metadata = await sharp(result.buffer).metadata();
      // Assert
      expect(metadata.format).toBe('jpeg');
      expect(metadata.width).toBe(40);
      expect(metadata.height).toBe(20);
    });

    it('does not enlarge an image smaller than the requested width', async () => {
      // Arrange
      const small = await createPng(16, 16);
      // Act
      const result = await Media.Image.bufferImage({
        input: small,
        maxWidth: 200,
        format: Media.AvailableOutputFormats.png,
      });
      const metadata = await sharp(result.buffer).metadata();
      // Assert
      expect(metadata.width).toBe(16);
      expect(metadata.height).toBe(16);
    });
  });

  describe('device pixel ratio', () => {
    it('scales dimensions and density by the device pixel ratio', async () => {
      // Arrange / Act
      const result = await Media.Image.bufferImage({
        input: squarePng,
        maxWidth: 32,
        dpr: 2,
        format: Media.AvailableOutputFormats.jpeg,
      });
      const metadata = await sharp(result.buffer).metadata();
      // Assert
      expect(metadata.width).toBe(64);
      expect(metadata.density).toBe(144);
    });

    it('clamps a device pixel ratio above 6 down to 6', async () => {
      // Arrange / Act
      const result = await Media.Image.bufferImage({
        input: squarePng,
        maxWidth: 10,
        dpr: 12,
        format: Media.AvailableOutputFormats.png,
      });
      const metadata = await sharp(result.buffer).metadata();
      // Assert
      expect(metadata.width).toBe(60);
      expect(metadata.density).toBe(432);
    });
  });

  describe('quality', () => {
    it('yields a smaller JPEG buffer at a lower quality setting', async () => {
      // Arrange
      const detailed = await sharp({
        create: {width: 128, height: 128, channels: 3, noise: {type: 'gaussian', mean: 128, sigma: 60}},
      }).png().toBuffer();
      // Act
      const low = await Media.Image.bufferImage({
        input: detailed,
        maxWidth: 128,
        format: Media.AvailableOutputFormats.jpeg,
        quality: 20,
      });
      const high = await Media.Image.bufferImage({
        input: detailed,
        maxWidth: 128,
        format: Media.AvailableOutputFormats.jpeg,
        quality: 95,
      });
      // Assert
      expect(low.buffer.length).toBeLessThan(high.buffer.length);
    });
  });

  describe('invalid input', () => {
    it('rejects a buffer that is not a supported image', async () => {
      // Arrange / Act / Assert
      await expect(Media.Image.bufferImage({
        input: Buffer.from('not-an-image'),
        maxWidth: 32,
        format: Media.AvailableOutputFormats.jpeg,
      })).rejects.toThrow();
    });
  });
});
