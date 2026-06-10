/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import {describe, expect, it} from 'vitest';
import specialCharToRegular from '../src/special-char-to-regular.js';

describe('specialCharToRegular', () => {
  it('returns an empty string when given null', () => {
    expect(specialCharToRegular(null)).toBe('');
  });

  it('returns an empty string for an empty string input', () => {
    expect(specialCharToRegular('')).toBe('');
  });

  it('leaves plain ASCII text unchanged', () => {
    expect(specialCharToRegular('Hello World')).toBe('Hello World');
  });

  it('replaces accented vowels with their ASCII equivalents', () => {
    expect(specialCharToRegular('á')).toBe('a');
    expect(specialCharToRegular('é')).toBe('e');
    expect(specialCharToRegular('í')).toBe('i');
    expect(specialCharToRegular('ó')).toBe('o');
    expect(specialCharToRegular('ú')).toBe('u');
  });

  it('replaces uppercase accented characters', () => {
    expect(specialCharToRegular('À')).toBe('A');
    expect(specialCharToRegular('È')).toBe('E');
    expect(specialCharToRegular('Í')).toBe('I');
    expect(specialCharToRegular('Ò')).toBe('O');
    expect(specialCharToRegular('Ú')).toBe('U');
  });

  it('replaces typographic quote variants with standard quotes', () => {
    expect(specialCharToRegular('«')).toBe('"');
    expect(specialCharToRegular('»')).toBe('"');
  });

  it('replaces division sign with forward slash', () => {
    expect(specialCharToRegular('÷')).toBe('/');
  });

  it('handles a mixed string with special and normal characters', () => {
    const result = specialCharToRegular('café');
    expect(result).toBe('cafe');
  });

  it('handles a longer sentence with multiple replacements', () => {
    const result = specialCharToRegular('résumé');
    expect(result).toBe('resume');
  });
});
