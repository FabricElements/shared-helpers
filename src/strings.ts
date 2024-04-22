/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */

/**
 * To Camel Case conversion
 * @param {string} str
 * @return {string}
 */
export const toCamelCase = (str: string): string => {
  return str.replace(/_([a-z])/g, (g) => {
    return g[1].toUpperCase();
  });
};
