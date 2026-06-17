/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import {Readable} from 'stream';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {getPublicUrl, getUrlAndGs, streamToBuffer, timeout} from '../src/global.js';

const FIREBASE_CONFIG_FIXTURE = JSON.stringify({storageBucket: 'my-project.appspot.com'});

describe('global', () => {
  describe('timeout', () => {
    it('resolves after roughly the specified milliseconds', async () => {
      const start = Date.now();
      await timeout(50);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(45);
    });

    it('returns a Promise', () => {
      const result = timeout(0);
      expect(result).toBeInstanceOf(Promise);
      return result;
    });
  });

  describe('getPublicUrl', () => {
    beforeEach(() => {
      process.env.FIREBASE_CONFIG = FIREBASE_CONFIG_FIXTURE;
    });

    afterEach(() => {
      delete process.env.FIREBASE_CONFIG;
    });

    it('returns a firebasestorage URL with alt=media', () => {
      const url = getPublicUrl('images/photo.jpg');
      expect(url).toContain('firebasestorage.googleapis.com');
      expect(url).toContain('alt=media');
    });

    it('encodes the filename in the URL', () => {
      const url = getPublicUrl('images/my photo.jpg');
      expect(url).toContain('images%2Fmy%20photo.jpg');
    });

    it('uses the bucket from FIREBASE_CONFIG', () => {
      const url = getPublicUrl('file.txt');
      expect(url).toContain('my-project.appspot.com');
    });

    it('throws when FIREBASE_CONFIG is not set', () => {
      delete process.env.FIREBASE_CONFIG;
      expect(() => getPublicUrl('file.txt')).toThrow('FIREBASE_CONFIG environment variable is not set');
    });

    it('throws when FIREBASE_CONFIG contains invalid JSON', () => {
      process.env.FIREBASE_CONFIG = 'not-valid-json{';
      expect(() => getPublicUrl('file.txt')).toThrow('FIREBASE_CONFIG environment variable contains invalid JSON');
    });
  });

  describe('getUrlAndGs', () => {
    beforeEach(() => {
      process.env.FIREBASE_CONFIG = FIREBASE_CONFIG_FIXTURE;
    });

    afterEach(() => {
      delete process.env.FIREBASE_CONFIG;
    });

    it('returns an object with gs and url fields', () => {
      const result = getUrlAndGs('media/video.mp4');
      expect(result).toHaveProperty('gs');
      expect(result).toHaveProperty('url');
    });

    it('gs is the original filename passed in', () => {
      const result = getUrlAndGs('media/video.mp4');
      expect(result.gs).toBe('media/video.mp4');
    });

    it('url contains the encoded filename with alt=media', () => {
      const result = getUrlAndGs('media/video.mp4');
      expect(result.url).toContain('alt=media');
      expect(result.url).toContain('media%2Fvideo.mp4');
    });

    it('url includes the bucket name from FIREBASE_CONFIG', () => {
      const result = getUrlAndGs('file.txt');
      expect(result.url).toContain('my-project.appspot.com');
    });

    it('throws when FIREBASE_CONFIG is not set', () => {
      delete process.env.FIREBASE_CONFIG;
      expect(() => getUrlAndGs('file.txt')).toThrow('FIREBASE_CONFIG environment variable is not set');
    });

    it('throws when FIREBASE_CONFIG contains invalid JSON', () => {
      process.env.FIREBASE_CONFIG = '{bad json}';
      expect(() => getUrlAndGs('file.txt')).toThrow('FIREBASE_CONFIG environment variable contains invalid JSON');
    });
  });

  describe('streamToBuffer', () => {
    it('collects all chunks into a single Buffer', async () => {
      const readable = Readable.from([Buffer.from('hello'), Buffer.from(' '), Buffer.from('world')]);
      const buffer = await streamToBuffer(readable);
      expect(buffer.toString()).toBe('hello world');
    });

    it('returns an empty Buffer for an empty stream', async () => {
      const readable = Readable.from([] as Buffer[]);
      const buffer = await streamToBuffer(readable);
      expect(buffer.length).toBe(0);
    });

    it('rejects when the stream emits an error', async () => {
      const readable = new Readable({
        read() {
          this.emit('error', new Error('stream error'));
        },
      });
      await expect(streamToBuffer(readable)).rejects.toThrow('stream error');
    });

    it('handles Buffer chunks as well as string chunks', async () => {
      const readable = Readable.from([Buffer.from('foo'), Buffer.from('bar')]);
      const buffer = await streamToBuffer(readable);
      expect(buffer.toString()).toBe('foobar');
    });
  });

  describe('vi.useFakeTimers with timeout', () => {
    it('resolves when fake timer is advanced', async () => {
      vi.useFakeTimers();
      const p = timeout(10000);
      vi.advanceTimersByTime(10000);
      await expect(p).resolves.toBeUndefined();
      vi.useRealTimers();
    });
  });
});
