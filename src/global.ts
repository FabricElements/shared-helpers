/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import {Buffer} from 'buffer';

/**
 * Timeout
 * @param {number} ms
 * @return {Promise<void>}
 */
export const timeout = (ms: number): Promise<void> => new Promise((res) => setTimeout(res, ms));

/**
 * Get file public url
 *
 * @param {string} filename
 * @return {string}
 */
export const getPublicUrl = (filename: string): string => {
  const firebaseConfig = JSON.parse(process.env.FIREBASE_CONFIG);
  const uri = encodeURIComponent(filename);
  return `https://firebasestorage.googleapis.com/v0/b/${firebaseConfig.storageBucket}/o/${uri}?alt=media`;
};

/**
 * Get file public url
 *
 * @param {string} filename
 * @return {{gs: string, url: string}}
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
 * Stream to buffer
 * Use on buffer media files and pipe functions
 * @param {any} stream
 * @return {Promise<Buffer>}
 */
export const streamToBuffer = (stream: any): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const buffers = [];
    stream.on('error', reject);
    stream.on('data', (data: any) => buffers.push(data));
    stream.on('end', () => resolve(Buffer.concat(buffers)));
  });
};
