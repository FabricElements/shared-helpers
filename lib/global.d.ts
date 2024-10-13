/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import { Buffer } from 'buffer';
/**
 * Timeout
 * @param {number} ms
 * @return {Promise<void>}
 */
export declare const timeout: (ms: number) => Promise<void>;
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
 * @return {{gs: string, url: string}}
 */
export declare const getUrlAndGs: (filename: string) => {
    gs: string;
    url: string;
};
/**
 * Stream to buffer
 * Use on buffer media files and pipe functions
 * @param {any} stream
 * @return {Promise<Buffer>}
 */
export declare const streamToBuffer: (stream: any) => Promise<Buffer>;
