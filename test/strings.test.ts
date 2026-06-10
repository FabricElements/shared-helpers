/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import {describe, expect, it} from 'vitest';
import {toCamelCase} from '../src/strings.js';

describe('toCamelCase', () => {
  it('converts a simple snake_case string', () => {
    expect(toCamelCase('hello_world')).toBe('helloWorld');
  });

  it('converts multiple underscores', () => {
    expect(toCamelCase('foo_bar_baz')).toBe('fooBarBaz');
  });

  it('leaves a string without underscores unchanged', () => {
    expect(toCamelCase('nounderscore')).toBe('nounderscore');
  });

  it('handles an empty string', () => {
    expect(toCamelCase('')).toBe('');
  });

  it('converts a leading underscore into an uppercase first letter', () => {
    // _([a-z]) regex matches `_p` at position 0, so `_private` → `Private`
    expect(toCamelCase('_private')).toBe('Private');
  });

  it('preserves already-camelCase input', () => {
    expect(toCamelCase('alreadyCamel')).toBe('alreadyCamel');
  });

  it('handles consecutive underscores by only converting the second word start', () => {
    expect(toCamelCase('a_b_c')).toBe('aBC');
  });
});
