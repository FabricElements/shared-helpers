// noinspection SpellCheckingInspection
/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import { randomInt } from 'crypto';
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
export default (length) => {
    const _length = length ?? 4;
    let text = '';
    const possible = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#%&*()_+<>?\';:,';
    for (let i = 0; i <= _length; i++) {
        text += possible.charAt(randomInt(0, possible.length));
    }
    return text;
};
//# sourceMappingURL=hash-id.js.map