/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
/**
 * Converts a snake_case string to camelCase.
 *
 * Replaces each underscore followed by a lowercase letter with the uppercase
 * equivalent of that letter.  Characters not preceded by an underscore are
 * returned unchanged.
 *
 * @param {string} str - The snake_case input string to convert.
 * @returns {string} The camelCase representation of the input string.
 */
export declare const toCamelCase: (str: string) => string;
