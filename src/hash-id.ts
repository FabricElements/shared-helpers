// noinspection SpellCheckingInspection

/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */

/**
 * Generate randomDomain hash id with 4 characters or more
 * @param {number} length Defaults to 4
 * @return {string}
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
