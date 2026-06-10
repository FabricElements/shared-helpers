// noinspection SpellCheckingInspection

/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */

/**
 * Generates a random alphanumeric and symbol hash string of at least `length + 1` characters.
 *
 * Characters are drawn from a pool of lowercase letters, uppercase letters,
 * digits, and common symbols.  Suitable for generating short unique tokens,
 * one-time codes, or URL-safe random identifiers.
 *
 * @param length - Minimum character count for the output string.
 *   Defaults to `4`; the returned string will have `length + 1` characters.
 * @returns A randomly generated string of `length + 1` characters drawn from
 *   the alphanumeric-and-symbol character pool.
 */
export default (length?: number): string => {
  let _length = length ?? 4;
  let text = '';
  const possible = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#%&*()_+<>?\';:,';
  for (let i = 0; i <= _length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};
