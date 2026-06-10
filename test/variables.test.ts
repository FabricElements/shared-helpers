/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import {emulator} from '../src/variables.js';

describe('variables', () => {
  describe('emulator', () => {
    const originalEnv = process.env.FUNCTIONS_EMULATOR;

    afterEach(() => {
      process.env.FUNCTIONS_EMULATOR = originalEnv;
    });

    it('is a boolean value', () => {
      expect(typeof emulator).toBe('boolean');
    });

    it('is false when FUNCTIONS_EMULATOR is not set at import time', () => {
      // The module is evaluated once; in the test environment the env var is
      // not set, so the exported value should be false.
      expect(emulator).toBe(false);
    });
  });

  describe('FUNCTIONS_EMULATOR env-driven boolean', () => {
    const originalEnv = process.env.FUNCTIONS_EMULATOR;

    beforeEach(() => {
      delete process.env.FUNCTIONS_EMULATOR;
    });

    afterEach(() => {
      process.env.FUNCTIONS_EMULATOR = originalEnv;
    });

    it('Boolean(undefined) is false', () => {
      expect(Boolean(process.env.FUNCTIONS_EMULATOR)).toBe(false);
    });

    it('Boolean("true") is true', () => {
      process.env.FUNCTIONS_EMULATOR = 'true';
      expect(Boolean(process.env.FUNCTIONS_EMULATOR)).toBe(true);
    });
  });
});
