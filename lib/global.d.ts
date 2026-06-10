/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import { Buffer } from 'buffer';
/**
 * Returns a Promise that resolves after the specified number of milliseconds.
 *
 * Useful for introducing deliberate pauses between Firestore batch commits
 * or other rate-limited operations without blocking the Node.js event loop.
 *
 * @param {number} ms - The duration to wait in milliseconds.
 * @returns {Promise<void>} A Promise that resolves to `void` after `ms` milliseconds.
 */
export declare const timeout: (ms: number) => Promise<void>;
/**
 * Constructs the public HTTPS URL for a file stored in Firebase Storage.
 *
 * Reads the `FIREBASE_CONFIG` environment variable to determine the
 * storage bucket name, then builds a `firebasestorage.googleapis.com`
 * URL with `alt=media` so browsers download the raw file bytes.
 *
 * @param {string} filename - The full storage object path (e.g., `'images/photo.jpg'`).
 * @returns {string} The public download URL string for the file.
 */
export declare const getPublicUrl: (filename: string) => string;
/**
 * Returns both the `gs://` Cloud Storage URI and the public HTTPS URL for a file.
 *
 * Reads the `FIREBASE_CONFIG` environment variable to resolve the bucket name.
 * Useful when a caller needs the raw storage reference alongside the
 * browser-accessible download link.
 *
 * @param {string} filename - The full storage object path (e.g., `'images/photo.jpg'`).
 * @returns {{gs: string, url: string}} An object containing:
 *   - `gs` — the original storage path (passed through as-is).
 *   - `url` — the public `firebasestorage.googleapis.com` download URL.
 */
export declare const getUrlAndGs: (filename: string) => {
    gs: string;
    url: string;
};
/**
 * Collects all chunks from a Node.js Readable stream into a single `Buffer`.
 *
 * Intended for use with piped media-file streams where the full binary
 * content must be buffered in memory before processing (e.g., image
 * transformation with `sharp`).
 *
 * @param {any} stream - Any Node.js Readable stream emitting `Buffer` or `string` chunks.
 * @returns {Promise<Buffer>} A Promise resolving to a `Buffer` containing all concatenated chunks.
 * @throws Rejects with the stream's error event payload if the stream errors.
 */
export declare const streamToBuffer: (stream: any) => Promise<Buffer>;
