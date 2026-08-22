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
export declare const isBlockedAddress: (address: string) => boolean;
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
export declare const assertSafeOutboundUrl: (url: string) => Promise<URL>;
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
export declare const safeFetch: (url: string, options?: InterfaceSafeFetchOptions) => Promise<Response>;
export default safeFetch;
