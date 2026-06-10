/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
/**
 * Normalises non-GSM characters in a string by replacing them with their
 * closest ASCII or GSM-7 equivalents.
 *
 * Iterates over each character in the input, looks up its Unicode code point
 * in a comprehensive replacement table, and substitutes any matched character
 * with the mapped GSM-compatible replacement.  Characters not present in the
 * table are left unchanged.  Useful for preparing SMS message bodies that must
 * stay within the GSM-7 character set to avoid multi-part encoding overhead.
 *
 * @param {string|null} text - The input string to normalise, or `null`.  When `null`, an
 *   empty string is returned.
 * @returns {string} The normalised string with all recognised special characters
 *   replaced by their GSM-7 counterparts.
 */
declare const _default: (text: string | null) => string;
export default _default;
