/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

// Mock node-fetch so no real HTTP requests are made.
const mockFetch = vi.fn();
vi.mock('node-fetch', () => ({default: mockFetch}));

import type {InterfaceAPIRequest} from '../src/interfaces.js';

describe('apiRequest', () => {
  let apiRequest: (options: InterfaceAPIRequest) => Promise<unknown>;

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import('../src/api-request.js');
    apiRequest = mod.default;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('throws when options.path is falsy', async () => {
    await expect(apiRequest({} as InterfaceAPIRequest)).rejects.toThrow('Invalid api call');
  });

  it('throws when the response is not ok', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: vi.fn().mockResolvedValue({message: 'Forbidden'}),
    });
    await expect(
      apiRequest({path: 'https://example.com', method: 'GET'}),
    ).rejects.toThrow('Forbidden');
  });

  it('throws with "unknown error" when error body has no message field', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: vi.fn().mockResolvedValue({}),
    });
    await expect(
      apiRequest({path: 'https://example.com', method: 'GET'}),
    ).rejects.toThrow('unknown error');
  });

  it('throws with "unknown error" when error body is not valid JSON', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: vi.fn().mockRejectedValue(new SyntaxError('Unexpected token')),
    });
    await expect(
      apiRequest({path: 'https://example.com', method: 'GET'}),
    ).rejects.toThrow('unknown error');
  });

  it('returns JSON when as is "json"', async () => {
    const payload = {data: 42};
    mockFetch.mockResolvedValue({
      ok: true,
      headers: {get: vi.fn().mockReturnValue('application/json')},
      json: vi.fn().mockResolvedValue(payload),
    });
    const result = await apiRequest({path: 'https://example.com', method: 'GET', as: 'json'});
    expect(result).toEqual(payload);
  });

  it('returns text when as is "text"', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      headers: {get: vi.fn().mockReturnValue('text/plain')},
      text: vi.fn().mockResolvedValue('hello'),
    });
    const result = await apiRequest({path: 'https://example.com', method: 'GET', as: 'text'});
    expect(result).toBe('hello');
  });

  it('returns raw body when as is "raw"', async () => {
    const fakeBody = {};
    mockFetch.mockResolvedValue({
      ok: true,
      headers: {get: vi.fn().mockReturnValue('application/octet-stream')},
      body: fakeBody,
    });
    const result = await apiRequest({path: 'https://example.com', method: 'GET', as: 'raw'});
    expect(result).toBe(fakeBody);
  });

  it('attaches Authorization header when scheme and credentials are provided', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      headers: {get: vi.fn().mockReturnValue('application/json')},
      json: vi.fn().mockResolvedValue({}),
    });
    await apiRequest({
      path: 'https://example.com',
      method: 'GET',
      as: 'json',
      scheme: 'Bearer',
      credentials: 'token123',
    });
    const calledOptions = mockFetch.mock.calls[0][1];
    expect(calledOptions.headers.Authorization).toBe('Bearer token123');
  });

  it('auto-detects JSON from content-type header when as is omitted', async () => {
    const payload = {auto: true};
    mockFetch.mockResolvedValue({
      ok: true,
      headers: {get: vi.fn().mockReturnValue('application/json')},
      json: vi.fn().mockResolvedValue(payload),
    });
    const result = await apiRequest({path: 'https://example.com', method: 'GET'});
    expect(result).toEqual(payload);
  });

  it('auto-detects text from text/plain content-type', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      headers: {get: vi.fn().mockReturnValue('text/plain')},
      text: vi.fn().mockResolvedValue('plain text'),
    });
    const result = await apiRequest({path: 'https://example.com', method: 'GET'});
    expect(result).toBe('plain text');
  });
});
