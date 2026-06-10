/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

// All variables referenced inside vi.mock factories must be declared with vi.hoisted.
const {mockPublishMessage, mockTopic, mockLoggerError} = vi.hoisted(() => {
  const mockPublishMessage = vi.fn().mockResolvedValue('msg-001');
  const mockTopic = vi.fn(() => ({publishMessage: mockPublishMessage}));
  const mockLoggerError = vi.fn();
  return {mockPublishMessage, mockTopic, mockLoggerError};
});

vi.mock('@google-cloud/pubsub', () => ({
  PubSub: vi.fn(() => ({topic: mockTopic})),
}));

vi.mock('firebase-functions/v2', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: mockLoggerError,
    log: vi.fn(),
  },
}));

vi.mock('../src/variables.js', () => ({emulator: false}));

import {PubSub} from '@google-cloud/pubsub';
import pubSubEvent from '../src/pubsub-event.js';

describe('pubSubEvent', () => {
  let ps: InstanceType<typeof PubSub>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPublishMessage.mockResolvedValue('msg-001');
    ps = new PubSub();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('publishes a JSON-serialised message to the specified topic', async () => {
    await pubSubEvent(ps, 'my-topic', {event: 'signup'});
    expect(mockTopic).toHaveBeenCalledWith('my-topic', {});
    expect(mockPublishMessage).toHaveBeenCalledOnce();
  });

  it('serialises the data payload as JSON in the message buffer', async () => {
    const data = {userId: 'abc', action: 'login'};
    await pubSubEvent(ps, 'my-topic', data);
    const call = mockPublishMessage.mock.calls[0][0];
    const decoded = JSON.parse(call.data.toString());
    expect(decoded).toEqual(data);
  });

  it('passes attributes to publishMessage', async () => {
    const attrs = {source: 'test'};
    await pubSubEvent(ps, 'my-topic', {}, attrs);
    const call = mockPublishMessage.mock.calls[0][0];
    expect(call.attributes).toEqual(attrs);
  });

  it('uses empty objects as defaults for data, attributes, and options', async () => {
    await pubSubEvent(ps, 'my-topic');
    const call = mockPublishMessage.mock.calls[0][0];
    const decoded = JSON.parse(call.data.toString());
    expect(decoded).toEqual({});
    expect(call.attributes).toEqual({});
  });

  it('sets process.exitCode to 1 and logs when publish fails', async () => {
    mockPublishMessage.mockRejectedValue(new Error('publish failed'));
    const originalExitCode = process.exitCode;
    await pubSubEvent(ps, 'my-topic', {});
    expect(mockLoggerError).toHaveBeenCalled();
    expect(process.exitCode).toBe(1);
    process.exitCode = originalExitCode;
  });
});
