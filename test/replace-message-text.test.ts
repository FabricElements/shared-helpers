/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import {describe, expect, it} from 'vitest';
import replaceMessageText from '../src/replace-message-text.js';

describe('replaceMessageText', () => {
  describe('basic placeholder replacement', () => {
    it('replaces a single placeholder from the data map', () => {
      const result = replaceMessageText({
        text: 'Hello {name}!',
        data: {name: 'Alice'},
      });
      expect(result).toBe('Hello Alice!');
    });

    it('replaces multiple placeholders', () => {
      const result = replaceMessageText({
        text: '{greeting} {name}, your code is {code}.',
        data: {greeting: 'Hi', name: 'Bob', code: '1234'},
      });
      expect(result).toBe('Hi Bob, your code is 1234.');
    });

    it('converts snake_case placeholder keys to camelCase before lookup', () => {
      const result = replaceMessageText({
        text: 'Dear {first_name}',
        data: {firstName: 'Carol'},
      });
      expect(result).toBe('Dear Carol');
    });

    it('replaces missing data key with an empty string', () => {
      const result = replaceMessageText({
        text: 'Value: {unknown}',
        data: {},
      });
      expect(result).toBe('Value: ');
    });
  });

  describe('special placeholders', () => {
    it('replaces {r} with a non-empty random hash', () => {
      const result = replaceMessageText({text: 'code={r}', data: {}});
      expect(result.startsWith('code=')).toBe(true);
      const hash = result.replace('code=', '');
      expect(hash.length).toBeGreaterThan(0);
    });

    it('replaces {reply_stop_unsubscribe} with a non-empty opt-out message', () => {
      const result = replaceMessageText({text: '{reply_stop_unsubscribe}', data: {}});
      expect(result.length).toBeGreaterThan(0);
    });

    it('uses a Spanish opt-out message when language is "es"', () => {
      const result = replaceMessageText({
        text: '{reply_stop_unsubscribe}',
        data: {},
        language: 'es',
      });
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    it('returns the text unchanged when there are no placeholders', () => {
      const result = replaceMessageText({text: 'No placeholders here.', data: {}});
      expect(result).toBe('No placeholders here.');
    });

    it('collapses multiple spaces', () => {
      const result = replaceMessageText({text: 'word  word', data: {}});
      expect(result).toBe('word word');
    });

    it('removes stray curly braces that remain after substitution', () => {
      const result = replaceMessageText({text: '{}leftover', data: {}});
      expect(result).not.toContain('{');
      expect(result).not.toContain('}');
    });

    it('handles an empty text string', () => {
      const result = replaceMessageText({text: '', data: {}});
      expect(result).toBe('');
    });
  });
});
