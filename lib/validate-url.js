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
export default (url) => {
    const baseURL = url ? String(url) : '';
    const cleanUrl = baseURL.replace(/\s+/g, '');
    const isURL = new RegExp('^(https|http)://(w{3}.)?([a-zA-Z0-9_-]+)([.][a-zA-Z0-9_-]+)');
    if (!isURL.test(cleanUrl)) {
        throw new Error('Invalid URL');
    }
    return cleanUrl.toString();
};
//# sourceMappingURL=validate-url.js.map