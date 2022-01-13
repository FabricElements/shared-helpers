/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
/**
 * Generate randomDomain hash id with 4 characters or more
 * @param {number} length
 * @return {string}
 */
export default (length = 4) => {
    let text = '';
    const possible = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#%&*()_+<>?\';:,';
    for (let i = 0; i <= length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
};
//# sourceMappingURL=hash-id.js.map