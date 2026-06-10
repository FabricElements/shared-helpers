/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import {describe, expect, it} from 'vitest';
import messageQueueSpeed from '../src/message-queue-speed.js';

describe('messageQueueSpeed', () => {
  describe('default options', () => {
    it('returns the expected shape', () => {
      const result = messageQueueSpeed();
      expect(result).toHaveProperty('instances');
      expect(result).toHaveProperty('limit');
      expect(result).toHaveProperty('sleep');
      expect(result).toHaveProperty('speed');
      expect(result.speed).toHaveProperty('second');
      expect(result.speed).toHaveProperty('minute');
      expect(result.speed).toHaveProperty('hour');
      expect(result.speed).toHaveProperty('day');
    });

    it('defaults to 1 instance', () => {
      expect(messageQueueSpeed().instances).toBe(1);
    });

    it('defaults sleep to 40 ms', () => {
      expect(messageQueueSpeed().sleep).toBe(40);
    });

    it('computes correct limit for default options (time=50s, sleep=40ms)', () => {
      // limitMilliseconds = 50000, executionTime = 400, messageTotalTime = 440
      // limitMessages = floor(50000 / 440) = 113
      expect(messageQueueSpeed().limit).toBe(113);
    });
  });

  describe('custom options', () => {
    it('scales speed values by the number of instances', () => {
      const single = messageQueueSpeed({instances: 1});
      const multi = messageQueueSpeed({instances: 3});
      expect(multi.speed.minute).toBe(single.speed.minute * 3);
      expect(multi.speed.hour).toBe(single.speed.hour * 3);
    });

    it('returns the supplied sleep value', () => {
      expect(messageQueueSpeed({sleep: 100}).sleep).toBe(100);
    });

    it('returns the supplied instances value', () => {
      expect(messageQueueSpeed({instances: 5}).instances).toBe(5);
    });

    it('higher sleep reduces the message limit', () => {
      const fast = messageQueueSpeed({sleep: 10});
      const slow = messageQueueSpeed({sleep: 500});
      expect(fast.limit).toBeGreaterThan(slow.limit);
    });

    it('speed.day equals speed.hour * 5', () => {
      const result = messageQueueSpeed({instances: 2, sleep: 50, time: 60});
      expect(result.speed.day).toBe(result.speed.hour * 5);
    });
  });
});
