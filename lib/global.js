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
export const timeout = (ms) => new Promise((res) => setTimeout(res, ms));
/**
 * Parses the `FIREBASE_CONFIG` environment variable and returns the resulting object.
 *
 * Throws a descriptive error when the variable is absent or its value is not
 * valid JSON, preventing silent `undefined` access or cryptic `SyntaxError`
 * propagation at call sites.
 *
 * @returns {Record<string, unknown>} The parsed Firebase configuration object.
 * @throws {Error} When `FIREBASE_CONFIG` is not set or cannot be parsed as JSON.
 */
const parseFirebaseConfig = () => {
    const raw = process.env.FIREBASE_CONFIG;
    if (!raw)
        throw new Error('FIREBASE_CONFIG environment variable is not set');
    try {
        return JSON.parse(raw);
    }
    catch {
        throw new Error('FIREBASE_CONFIG environment variable contains invalid JSON');
    }
};
/**
 * Constructs the public HTTPS URL for a file stored in Firebase Storage.
 *
 * Reads the `FIREBASE_CONFIG` environment variable to determine the
 * storage bucket name, then builds a `firebasestorage.googleapis.com`
 * URL with `alt=media` so browsers download the raw file bytes.
 *
 * @param {string} filename - The full storage object path (e.g., `'images/photo.jpg'`).
 * @returns {string} The public download URL string for the file.
 * @throws {Error} When `FIREBASE_CONFIG` is absent or contains invalid JSON.
 */
export const getPublicUrl = (filename) => {
    const firebaseConfig = parseFirebaseConfig();
    const uri = encodeURIComponent(filename);
    return `https://firebasestorage.googleapis.com/v0/b/${firebaseConfig.storageBucket}/o/${uri}?alt=media`;
};
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
 * @throws {Error} When `FIREBASE_CONFIG` is absent or contains invalid JSON.
 */
export const getUrlAndGs = (filename) => {
    const firebaseConfig = parseFirebaseConfig();
    const uri = encodeURIComponent(filename);
    const bucketName = firebaseConfig.storageBucket;
    const url = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${uri}?alt=media`;
    return {
        gs: filename,
        url,
    };
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
export const streamToBuffer = (stream) => {
    return new Promise((resolve, reject) => {
        const buffers = [];
        stream.on('error', reject);
        stream.on('data', (data) => buffers.push(data));
        stream.on('end', () => resolve(Buffer.concat(buffers)));
    });
};
//# sourceMappingURL=global.js.map