/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */

/**
 * Timeout
 * @param {number} ms
 * @return {Promise<any>}
 */
export const timeout = (ms: number) => new Promise((res) => setTimeout(res, ms));

/**
 * Get file public url
 *
 * @param {string} filename
 * @return {string}
 */
export const getPublicUrl = (filename: string) => {
  const adminConfig = JSON.parse(process.env.FIREBASE_CONFIG);
  const uri = encodeURIComponent(filename);
  return `https://firebasestorage.googleapis.com/v0/b/${adminConfig.storageBucket}/o/${uri}?alt=media`;
};

/**
 * Get file public url
 *
 * @param {string} filename
 * @return {string}
 */
export const getUrlAndGs = (filename: string) => {
  const adminConfig = JSON.parse(process.env.FIREBASE_CONFIG);
  const uri = encodeURIComponent(filename);
  const bucketName = adminConfig.storageBucket;
  const url = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${uri}?alt=media`;
  return {
    gs: filename,
    url,
  };
};

/**
 * Stream to buffer
 * Use on buffer media files and pipe functions
 * @param stream
 */
export const streamToBuffer = (stream) => {
  return new Promise((resolve, reject) => {
    let buffers = [];
    stream.on("error", reject);
    stream.on("data", (data) => buffers.push(data));
    stream.on("end", () => resolve(Buffer.concat(buffers)));
  });
};
