/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
/**
 * Timeout
 * @param {number} ms
 * @return {Promise<any>}
 */
export declare const timeout: (ms: number) => Promise<unknown>;
/**
 * Get file public url
 *
 * @param {string} filename
 * @return {string}
 */
export declare const getPublicUrl: (filename: string) => string;
/**
 * Get file public url
 *
 * @param {string} filename
 * @return {string}
 */
export declare const getUrlAndGs: (filename: string) => {
    gs: string;
    url: string;
};
/**
 * Stream to buffer
 * Use on buffer media files and pipe functions
 * @param stream
 */
export declare const streamToBuffer: (stream: any) => Promise<unknown>;
