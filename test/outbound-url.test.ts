/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import {beforeEach, describe, expect, it, vi} from 'vitest';

const {mockLookup} = vi.hoisted(() => ({mockLookup: vi.fn()}));

vi.mock('dns/promises', () => ({lookup: mockLookup}));

import {assertSafeOutboundUrl, isBlockedAddress, safeFetch} from '../src/outbound-url.js';

/**
 * Builds a minimal `Response`-like stub for the mocked global `fetch`.
 *
 * @param {number} status - HTTP status code to report.
 * @param {string|null} [location] - Optional `Location` header value.
 * @returns {object} A stub exposing the `status` and `headers.get` surface used by `safeFetch`.
 */
const responseStub = (status: number, location: string | null = null) => ({
  status,
  ok: status >= 200 && status < 300,
  headers: {get: (name: string) => (name === 'location' ? location : null)},
});

describe('isBlockedAddress', () => {
  it.each([
    '0.0.0.0',
    '10.1.2.3',
    '100.64.0.1',
    '127.0.0.1',
    '169.254.169.254',
    '172.16.0.1',
    '172.31.255.255',
    '192.168.1.1',
    '224.0.0.1',
    '240.0.0.1',
  ])('blocks the reserved IPv4 address %s', (address) => {
    expect(isBlockedAddress(address)).toBe(true);
  });

  it.each([
    '1.1.1.1',
    '8.8.8.8',
    '93.184.216.34',
    '172.15.255.255',
    '172.32.0.1',
  ])('allows the publicly routable IPv4 address %s', (address) => {
    expect(isBlockedAddress(address)).toBe(false);
  });

  it.each([
    '::',
    '::1',
    'fc00::1',
    'fd12:3456::1',
    'fe80::1',
    'ff02::1',
  ])('blocks the reserved IPv6 address %s', (address) => {
    expect(isBlockedAddress(address)).toBe(true);
  });

  it('allows a publicly routable IPv6 address', () => {
    expect(isBlockedAddress('2001:4860:4860::8888')).toBe(false);
  });

  it('blocks an IPv4-mapped IPv6 metadata address', () => {
    expect(isBlockedAddress('::ffff:169.254.169.254')).toBe(true);
  });

  it('allows an IPv4-mapped IPv6 public address', () => {
    expect(isBlockedAddress('::ffff:8.8.8.8')).toBe(false);
  });

  it('blocks a NAT64-embedded metadata address', () => {
    expect(isBlockedAddress('64:ff9b::169.254.169.254')).toBe(true);
  });

  it('allows a NAT64-embedded public address', () => {
    expect(isBlockedAddress('64:ff9b::8.8.8.8')).toBe(false);
  });

  it('treats a non-address string as unsafe', () => {
    expect(isBlockedAddress('example.com')).toBe(true);
  });
});

describe('assertSafeOutboundUrl', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLookup.mockResolvedValue([{address: '93.184.216.34'}]);
  });

  it('accepts an https URL whose host resolves publicly', async () => {
    const parsed = await assertSafeOutboundUrl('https://example.com/avatar.jpg');
    expect(parsed.hostname).toBe('example.com');
    expect(mockLookup).toHaveBeenCalledWith('example.com', {all: true});
  });

  it.each(['file:///etc/passwd', 'ftp://example.com/x', 'data:text/plain,hi'])(
    'rejects the disallowed scheme in %s', async (url) => {
      await expect(assertSafeOutboundUrl(url)).rejects.toThrow('Invalid URL protocol');
    });

  it('rejects a malformed URL', async () => {
    await expect(assertSafeOutboundUrl('not a url')).rejects.toThrow('Invalid URL');
  });

  it('rejects embedded credentials', async () => {
    await expect(assertSafeOutboundUrl('https://user:pass@example.com/'))
      .rejects.toThrow('credentials are not allowed');
  });

  it('rejects a literal metadata address without resolving DNS', async () => {
    await expect(assertSafeOutboundUrl('http://169.254.169.254/latest/meta-data/'))
      .rejects.toThrow('address is not allowed');
    expect(mockLookup).not.toHaveBeenCalled();
  });

  it('rejects a literal IPv4-mapped IPv6 metadata address', async () => {
    await expect(assertSafeOutboundUrl('http://[::ffff:169.254.169.254]/'))
      .rejects.toThrow('address is not allowed');
  });

  it('rejects a host that resolves to a private address', async () => {
    mockLookup.mockResolvedValue([{address: '10.0.0.5'}]);
    await expect(assertSafeOutboundUrl('https://internal.example.com/'))
      .rejects.toThrow('address is not allowed');
  });

  it('rejects when any resolved address is private', async () => {
    mockLookup.mockResolvedValue([{address: '93.184.216.34'}, {address: '127.0.0.1'}]);
    await expect(assertSafeOutboundUrl('https://mixed.example.com/'))
      .rejects.toThrow('address is not allowed');
  });

  it('fails closed when DNS resolution errors', async () => {
    mockLookup.mockRejectedValue(new Error('ENOTFOUND'));
    await expect(assertSafeOutboundUrl('https://missing.example.com/'))
      .rejects.toThrow('host could not be resolved');
  });

  it('fails closed when DNS returns no addresses', async () => {
    mockLookup.mockResolvedValue([]);
    await expect(assertSafeOutboundUrl('https://empty.example.com/'))
      .rejects.toThrow('host could not be resolved');
  });
});

describe('safeFetch', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockLookup.mockResolvedValue([{address: '93.184.216.34'}]);
    fetchMock = vi.fn().mockResolvedValue(responseStub(200));
    vi.stubGlobal('fetch', fetchMock);
  });

  it('fetches a validated URL', async () => {
    const response = await safeFetch('https://example.com/avatar.jpg');
    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][1]).toMatchObject({method: 'GET', redirect: 'manual'});
  });

  it('never issues a request for a blocked URL', async () => {
    await expect(safeFetch('http://169.254.169.254/')).rejects.toThrow('address is not allowed');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('follows a redirect to a public host', async () => {
    fetchMock
      .mockResolvedValueOnce(responseStub(302, 'https://cdn.example.com/avatar.jpg'))
      .mockResolvedValueOnce(responseStub(200));
    const response = await safeFetch('https://example.com/avatar.jpg');
    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('re-validates redirect hops and refuses one pointing at a private address', async () => {
    fetchMock.mockResolvedValueOnce(responseStub(302, 'http://169.254.169.254/latest/meta-data/'));
    await expect(safeFetch('https://example.com/avatar.jpg')).rejects.toThrow('address is not allowed');
    // Positive control: the first hop really was fetched, so the rejection came from
    // the redirect check rather than from the request never being made.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('stops after the redirect limit', async () => {
    fetchMock.mockResolvedValue(responseStub(302, 'https://example.com/next'));
    await expect(safeFetch('https://example.com/', {maxRedirects: 2}))
      .rejects.toThrow('Too many redirects');
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
