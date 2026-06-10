/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import {Buffer} from 'buffer';

/**
 * Returns a Promise that resolves after the specified number of milliseconds.
 *
 * Useful for introducing deliberate pauses between Firestore batch commits
 * or other rate-limited operations without blocking the Node.js event loop.
 *
 * @param ms - The duration to wait in milliseconds.
 * @returns A Promise that resolves to `void` after `ms` milliseconds.
 */
export const timeout = (ms: number): Promise<void> => new Promise((res) => setTimeout(res, ms));

/**
 * Constructs the public HTTPS URL for a file stored in Firebase Storage.
 *
 * Reads the `FIREBASE_CONFIG` environment variable to determine the
 * storage bucket name, then builds a `firebasestorage.googleapis.com`
 * URL with `alt=media` so browsers download the raw file bytes.
 *
 * @param filename - The full storage object path (e.g., `'images/photo.jpg'`).
 * @returns The public download URL string for the file.
 */
export const getPublicUrl = (filename: string): string => {
  const firebaseConfig = JSON.parse(process.env.FIREBASE_CONFIG);
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
 * @param filename - The full storage object path (e.g., `'images/photo.jpg'`).
 * @returns An object containing:
 *   - `gs` — the original storage path (passed through as-is).
 *   - `url` — the public `firebasestorage.googleapis.com` download URL.
 */
export const getUrlAndGs = (filename: string): { gs: string, url: string } => {
  const firebaseConfig = JSON.parse(process.env.FIREBASE_CONFIG);
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
 * @param stream - Any Node.js Readable stream emitting `Buffer` or `string` chunks.
 * @returns A Promise resolving to a `Buffer` containing all concatenated chunks.
 * @throws Rejects with the stream's error event payload if the stream errors.
 */
export const streamToBuffer = (stream: any): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const buffers = [];
    stream.on('error', reject);
    stream.on('data', (data: any) => buffers.push(data));
    stream.on('end', () => resolve(Buffer.concat(buffers)));
  });
};
