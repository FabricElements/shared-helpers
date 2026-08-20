/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

/**
 * Tests for the `media-formats` leaf module and, more importantly, a regression
 * guard for the `media` <-> `regex` circular import.
 *
 * This file deliberately loads the `media` entry point **in isolation** — the
 * package barrel (`src/index.ts`) is never imported first, and `../src/regex.js`
 * is **not** mocked. Before the leaf module existed, `regex.ts` dereferenced
 * `Media.AvailableOutputFormats` at module top level while `media.ts` was still
 * initialising, so this import threw
 * `TypeError: Cannot read properties of undefined (reading 'AvailableOutputFormats')`.
 */

vi.mock('firebase-admin/storage', () => ({
  getStorage: vi.fn(() => ({
    bucket: vi.fn(() => ({file: vi.fn()})),
  })),
}));

vi.mock('firebase-functions/v2', () => ({
  logger: {info: vi.fn(), warn: vi.fn(), error: vi.fn(), log: vi.fn()},
  https: {HttpsError: class HttpsError extends Error {}},
}));

vi.mock('../src/variables.js', () => ({emulator: false}));

// Ensure no test in this file can reach the network.
vi.stubGlobal('fetch', vi.fn(() => {
  throw new Error('Network access is not allowed in tests');
}));

import {AvailableOutputFormats} from '../src/media-formats.js';

describe('media-formats leaf module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exposes the full set of libvips container formats', () => {
    expect(Object.keys(AvailableOutputFormats)).toEqual([
      'avif', 'dz', 'fits', 'gif', 'heif', 'input', 'jpeg', 'jp2', 'jxl',
      'magick', 'openslide', 'pdf', 'png', 'ppm', 'raw', 'svg', 'tiff', 'v', 'webp',
    ]);
  });

  it('maps every member to its own name', () => {
    for (const [key, value] of Object.entries(AvailableOutputFormats)) {
      expect(value).toBe(key);
    }
  });
});

describe('media <-> regex circular import regression', () => {
  it('loads the /media entry point in isolation without the barrel', async () => {
    const media = await import('../src/media.js');

    expect(media.Media).toBeDefined();
    expect(media.Media.AvailableOutputFormats).toBeDefined();
    expect(media.Media.AvailableOutputFormats.jpeg).toBe('jpeg');
  });

  it('keeps Media.AvailableOutputFormats identical to the leaf enum', async () => {
    const {Media} = await import('../src/media.js');

    expect(Media.AvailableOutputFormats).toBe(AvailableOutputFormats);
  });

  it('builds contentTypeIsImageForSharp from the leaf enum without a cycle', async () => {
    const {contentTypeIsImageForSharp} = await import('../src/regex.js');

    expect(contentTypeIsImageForSharp).toBeInstanceOf(RegExp);
    expect(contentTypeIsImageForSharp.source)
      .toBe(`^(image\\/)(${Object.keys(AvailableOutputFormats).join('|')})`);
  });
});
