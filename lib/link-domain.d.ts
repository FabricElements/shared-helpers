/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
export declare const domains: string[];
/**
 * Return Domain and Url.
 *
 * @param {object} options
 * @returns {string}
 */
export declare const randomDomain: (options?: {
    domains?: string[];
    id?: string | null;
}) => string;
