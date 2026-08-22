/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import {lookup} from 'dns/promises';
import {isIPv4, isIPv6} from 'net';

/**
 * IPv4 ranges that must never be reachable from a caller-supplied URL, expressed
 * as `[networkAddress, prefixLength]` pairs.
 *
 * Covers loopback, link-local (including the cloud instance-metadata endpoint at
 * `169.254.169.254`), RFC 1918 private space, carrier-grade NAT, IETF protocol
 * assignments, documentation ranges, multicast, and reserved space.
 */
const blockedIPv4Ranges: readonly [string, number][] = Object.freeze([
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
]);

/**
 * URL schemes an outbound request is allowed to use.  Everything else — `file:`,
 * `gopher:`, `data:`, `ftp:` — is rejected outright.
 */
const allowedProtocols: readonly string[] = Object.freeze(['http:', 'https:']);

/**
 * Converts a dotted-quad IPv4 string into its unsigned 32-bit integer value.
 *
 * @param {string} address - A dotted-quad IPv4 address such as `'169.254.169.254'`.
 * @returns {number} The address as an unsigned 32-bit integer.
 */
const ipv4ToInt = (address: string): number => address
  .split('.')
  .reduce((total, octet) => ((total << 8) + Number(octet)) >>> 0, 0) >>> 0;

/**
 * Expands an IPv6 address — including `::` compressed and IPv4-mapped forms — into
 * its eight 16-bit groups.
 *
 * The IPv4 tail of a mapped or NAT64 address (`::ffff:169.254.169.254`) is folded
 * into the final two groups so that a single numeric representation covers both
 * notations.
 *
 * @param {string} address - Any valid IPv6 address string.
 * @returns {number[]} An array of exactly eight 16-bit group values.
 */
const expandIPv6 = (address: string): number[] => {
  let value = address.split('%')[0];
  const lastColon = value.lastIndexOf(':');
  const tail = value.slice(lastColon + 1);
  // Fold a trailing dotted-quad (IPv4-mapped / NAT64 notation) into two groups.
  if (isIPv4(tail)) {
    const octets = tail.split('.').map(Number);
    const high = ((octets[0] << 8) | octets[1]).toString(16);
    const low = ((octets[2] << 8) | octets[3]).toString(16);
    value = `${value.slice(0, lastColon + 1)}${high}:${low}`;
  }
  const [head, rest] = value.split('::');
  const headGroups = head ? head.split(':').filter(Boolean).map((group) => parseInt(group, 16)) : [];
  const tailGroups = rest ? rest.split(':').filter(Boolean).map((group) => parseInt(group, 16)) : [];
  const padding = new Array(Math.max(0, 8 - headGroups.length - tailGroups.length)).fill(0);
  return rest === undefined ? headGroups : [...headGroups, ...padding, ...tailGroups];
};

/**
 * Renders the final 32 bits of an expanded IPv6 address as a dotted-quad IPv4 string.
 *
 * @param {number[]} groups - Eight 16-bit groups produced by `expandIPv6`.
 * @returns {string} The embedded IPv4 address in dotted-quad notation.
 */
const embeddedIPv4 = (groups: number[]): string => [
  groups[6] >> 8,
  groups[6] & 0xff,
  groups[7] >> 8,
  groups[7] & 0xff,
].join('.');

/**
 * Reports whether a literal IP address belongs to a range that must not be
 * reachable from a caller-supplied URL.
 *
 * Handles IPv4 and IPv6, and unwraps the two notations that most often bypass a
 * naive check: **IPv4-mapped IPv6** (`::ffff:169.254.169.254`) and **NAT64**
 * (`64:ff9b::169.254.169.254`), both of which are re-tested as IPv4.
 *
 * @param {string} address - A literal IPv4 or IPv6 address.  Hostnames are not accepted.
 * @returns {boolean} `true` when the address is loopback, link-local, private,
 *   unique-local, multicast, or otherwise reserved; `false` when it is publicly routable.
 */
export const isBlockedAddress = (address: string): boolean => {
  if (isIPv4(address)) {
    const value = ipv4ToInt(address);
    return blockedIPv4Ranges.some(([network, prefix]) => {
      const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
      return (value & mask) >>> 0 === (ipv4ToInt(network) & mask) >>> 0;
    });
  }
  if (!isIPv6(address)) return true; // Not a literal address — treat as unsafe.
  const groups = expandIPv6(address);
  if (groups.length !== 8 || groups.some((group) => Number.isNaN(group))) return true;
  const isZeroPrefix = groups.slice(0, 5).every((group) => group === 0);
  // IPv4-mapped (`::ffff:a.b.c.d`) — re-check the embedded IPv4 address.
  if (isZeroPrefix && groups[5] === 0xffff) {
    return isBlockedAddress(embeddedIPv4(groups));
  }
  // NAT64 (`64:ff9b::/96`) — re-check the embedded IPv4 address.
  if (groups[0] === 0x0064 && groups[1] === 0xff9b && groups.slice(2, 6).every((group) => group === 0)) {
    return isBlockedAddress(embeddedIPv4(groups));
  }
  // `::` unspecified and `::1` loopback.
  if (isZeroPrefix && groups[5] === 0 && groups[6] === 0 && groups[7] <= 1) return true;
  // `fc00::/7` unique-local.
  if ((groups[0] & 0xfe00) === 0xfc00) return true;
  // `fe80::/10` link-local.
  if ((groups[0] & 0xffc0) === 0xfe80) return true;
  // `ff00::/8` multicast.
  return (groups[0] & 0xff00) === 0xff00;
};

/**
 * Validates that a URL is safe to fetch, failing closed on anything suspicious.
 *
 * Rejects non-`http(s)` schemes, embedded credentials, and hosts that resolve to a
 * non-routable address.  When the host is a literal IP it is checked directly;
 * otherwise every address returned by DNS is checked, so a name that resolves to
 * loopback or to a cloud metadata endpoint is refused.
 *
 * Callers should treat a thrown error as "do not fetch this".  A DNS failure is
 * also an error — an unresolvable host is never silently allowed through.
 *
 * @param {string} url - The caller-supplied URL to validate.
 * @returns {Promise<URL>} A Promise resolving to the parsed `URL` when it is safe to fetch.
 * @throws {Error} When the URL is malformed, uses a disallowed scheme, carries
 *   credentials, cannot be resolved, or resolves to a blocked address.
 */
export const assertSafeOutboundUrl = async (url: string): Promise<URL> => {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error('Invalid URL');
  }
  if (!allowedProtocols.includes(parsed.protocol)) {
    throw new Error('Invalid URL protocol');
  }
  if (parsed.username || parsed.password) {
    throw new Error('Invalid URL: credentials are not allowed');
  }
  // `URL` keeps IPv6 literals wrapped in brackets; strip them before validating.
  const hostname = parsed.hostname.replace(/^\[|]$/g, '');
  if (isIPv4(hostname) || isIPv6(hostname)) {
    if (isBlockedAddress(hostname)) throw new Error('Invalid URL: address is not allowed');
    return parsed;
  }
  let addresses: {address: string}[];
  try {
    addresses = await lookup(hostname, {all: true});
  } catch {
    throw new Error('Invalid URL: host could not be resolved');
  }
  if (!addresses.length) throw new Error('Invalid URL: host could not be resolved');
  for (const entry of addresses) {
    if (isBlockedAddress(entry.address)) throw new Error('Invalid URL: address is not allowed');
  }
  return parsed;
};

/**
 * Options accepted by {@link safeFetch}.
 */
export interface InterfaceSafeFetchOptions {
  /** Maximum number of redirect hops to follow.  Each hop is re-validated.  Defaults to `3`. */
  maxRedirects?: number;
  /** Request timeout in milliseconds, applied to the whole redirect chain.  Defaults to `30000`. */
  timeoutMs?: number;
}

/**
 * Performs an SSRF-guarded `GET` request against a caller-supplied URL.
 *
 * The target is validated with {@link assertSafeOutboundUrl} before the request is
 * issued.  Redirects are handled manually rather than by the platform, because a
 * server that passed validation can still redirect to a private address — every
 * `Location` hop is therefore re-validated before it is followed.  The request is
 * bounded by an abort signal so a slow or hanging origin cannot pin the function
 * open for its whole timeout budget.
 *
 * Note: validation resolves DNS and re-checks the resolved addresses, but the
 * connection itself is opened by `fetch` and is not pinned to the validated
 * address, so a same-millisecond DNS-rebinding race is out of scope here.
 *
 * @param {string} url - The caller-supplied URL to fetch.
 * @param {InterfaceSafeFetchOptions} [options] - Redirect and timeout limits.
 * @returns {Promise<Response>} A Promise resolving to the final non-redirect `Response`.
 * @throws {Error} When the URL — or any redirect target — fails validation, or when
 *   the redirect limit is exceeded.
 */
export const safeFetch = async (url: string, options: InterfaceSafeFetchOptions = {}): Promise<Response> => {
  const maxRedirects = options.maxRedirects ?? 3;
  const timeoutMs = options.timeoutMs ?? 30000;
  const signal = AbortSignal.timeout(timeoutMs);
  let target = (await assertSafeOutboundUrl(url)).toString();
  for (let hop = 0; hop <= maxRedirects; hop++) {
    const response = await fetch(target, {
      method: 'GET',
      redirect: 'manual',
      signal,
    });
    const isRedirect = response.status >= 300 && response.status < 400;
    if (!isRedirect) return response;
    const location = response.headers.get('location');
    if (!location) return response;
    // Re-validate every hop: the first host passing validation says nothing about the next.
    target = (await assertSafeOutboundUrl(new URL(location, target).toString())).toString();
  }
  throw new Error('Too many redirects');
};

export default safeFetch;
