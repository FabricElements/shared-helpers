/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
/**
 * Validates a URL string and strips any embedded whitespace.
 *
 * Checks that the URL starts with `http://` or `https://` followed by a valid
 * hostname pattern.  Whitespace is removed before validation so incidentally
 * padded strings are accepted.
 *
 * @param {string|null} url - The raw URL string to validate, or `null`.
 * @returns {string} The cleaned URL string with all whitespace removed.
 * @throws {Error} When the string does not match the expected HTTP/HTTPS URL pattern.
 */
declare const _default: (url: string | null) => string;
export default _default;
