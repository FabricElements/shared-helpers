/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import {describe, expect, it} from 'vitest';
import checkNumber from '../src/check-number.js';

describe('checkNumber', () => {
  describe('valid US mobile numbers', () => {
    it('returns E.164 format for a standard US number without country code', () => {
      const result = checkNumber('5551234567');
      expect(result).not.toBeNull();
      expect(result).toMatch(/^\+1\d{10}$/);
    });

    it('returns E.164 format for a number with +1 prefix', () => {
      const result = checkNumber('+15005550006');
      expect(result).toBe('+15005550006');
    });

    it('accepts a numeric input and returns E.164 string', () => {
      const result = checkNumber(15005550006);
      expect(result).toBe('+15005550006');
    });

    it('strips non-digit non-plus characters before parsing', () => {
      const result = checkNumber('(500) 555-0006');
      expect(result).toBe('+15005550006');
    });

    it('strips dashes and spaces', () => {
      const result = checkNumber('500-555-0006');
      expect(result).toBe('+15005550006');
    });
  });

  describe('invalid inputs', () => {
    it('returns null for an empty string', () => {
      expect(checkNumber('')).toBeNull();
    });

    it('returns null for a non-numeric string', () => {
      expect(checkNumber('not-a-number')).toBeNull();
    });

    it('returns null for a string that contains only letters', () => {
      expect(checkNumber('abcdefghij')).toBeNull();
    });

    it('returns null for a number with only special characters', () => {
      expect(checkNumber('!!!---')).toBeNull();
    });
  });
});
