/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import {describe, expect, it} from 'vitest';
import validateUrl from '../src/validate-url.js';

describe('validateUrl', () => {
  describe('valid URLs', () => {
    it('accepts a basic https URL', () => {
      expect(validateUrl('https://example.com')).toBe('https://example.com');
    });

    it('accepts a basic http URL', () => {
      expect(validateUrl('http://example.com')).toBe('http://example.com');
    });

    it('accepts a URL with www subdomain', () => {
      expect(validateUrl('https://www.example.com')).toBe('https://www.example.com');
    });

    it('accepts a URL with path', () => {
      const url = 'https://example.com/path/to/page';
      expect(validateUrl(url)).toBe(url);
    });

    it('strips embedded whitespace before returning', () => {
      expect(validateUrl('https://exam ple.com')).toBe('https://example.com');
    });

    it('strips leading/trailing spaces', () => {
      expect(validateUrl('  https://example.com  ')).toBe('https://example.com');
    });
  });

  describe('invalid URLs', () => {
    it('throws for a null input', () => {
      expect(() => validateUrl(null)).toThrow('Invalid URL');
    });

    it('throws for an empty string', () => {
      expect(() => validateUrl('')).toThrow('Invalid URL');
    });

    it('throws for a plain domain without protocol', () => {
      expect(() => validateUrl('example.com')).toThrow('Invalid URL');
    });

    it('throws for ftp protocol', () => {
      expect(() => validateUrl('ftp://example.com')).toThrow('Invalid URL');
    });

    it('throws for a bare string with no domain', () => {
      expect(() => validateUrl('notaurl')).toThrow('Invalid URL');
    });
  });
});
