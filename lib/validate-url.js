/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
/**
 * Check if URl is valid and format
 *
 * @param {string} url
 * @return {string} {boolean}
 */
export default (url) => {
    const baseURL = url ? String(url) : '';
    const cleanUrl = baseURL.replace(/\s+/g, '');
    const isURL = new RegExp('^(https|http)://(w{3}.)?([a-zA-Z0-9_-]+)([.][a-zA-Z0-9_-]+)');
    if (!isURL.test(cleanUrl)) {
        throw new Error(`Invalid URL: ${url}`);
    }
    return cleanUrl.toString();
};
//# sourceMappingURL=validate-url.js.map