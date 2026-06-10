/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import {describe, expect, it} from 'vitest';
import hashId from '../src/hash-id.js';

describe('hashId', () => {
  it('returns a string', () => {
    expect(typeof hashId()).toBe('string');
  });

  it('returns length + 1 characters when a length is specified', () => {
    expect(hashId(4)).toHaveLength(5);
    expect(hashId(10)).toHaveLength(11);
    expect(hashId(0)).toHaveLength(1);
  });

  it('defaults to 5 characters (length 4 + 1) when no argument is given', () => {
    expect(hashId()).toHaveLength(5);
  });

  it('returns different values on consecutive calls (random)', () => {
    const results = new Set(Array.from({length: 20}, () => hashId(8)));
    expect(results.size).toBeGreaterThan(1);
  });

  it('only uses characters from the allowed pool', () => {
    const allowedPattern = /^[a-zA-Z0-9!@#%&*()_+<>?';:,]+$/;
    for (let i = 0; i < 50; i++) {
      expect(hashId(8)).toMatch(allowedPattern);
    }
  });
});
