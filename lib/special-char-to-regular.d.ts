/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
/**
 * Normalises non-GSM characters in a string by replacing them with their
 * closest ASCII or GSM-7 equivalents.
 *
 * Performs a single left-to-right pass over the input, looking up each
 * character's UTF-16 code unit in the module-level replacement table and
 * appending either the mapped replacement or the original character.  Runs in
 * linear time and preserves every occurrence of a mapped character.  Useful for
 * preparing SMS message bodies that must stay within the GSM-7 character set to
 * avoid multi-part encoding overhead.
 *
 * @param {string|null} text - The input string to normalise, or `null`.  When `null`, an
 *   empty string is returned.
 * @returns {string} The normalised string with all recognised special characters
 *   replaced by their GSM-7 counterparts.
 */
declare const _default: (text: string | null) => string;
export default _default;
