/**
 * Generates a cryptographically random alphanumeric and symbol hash string of
 * at least `length + 1` characters.
 *
 * Characters are drawn from a pool of lowercase letters, uppercase letters,
 * digits, and common symbols using `crypto.randomInt`, which produces
 * cryptographically strong random values suitable for one-time codes, tokens,
 * or URL-safe random identifiers.
 *
 * @param {number} [length] - Minimum character count for the output string.
 *   Defaults to `4`; the returned string will have `length + 1` characters.
 * @returns {string} A randomly generated string of `length + 1` characters drawn from
 *   the alphanumeric-and-symbol character pool.
 */
declare const _default: (length?: number) => string;
export default _default;
