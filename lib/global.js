/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
/**
 * Timeout
 * @param {number} ms
 * @return {Promise<any>}
 */
export const timeout = (ms) => new Promise((res) => setTimeout(res, ms));
/**
 * Get file public url
 *
 * @param {string} filename
 * @return {string}
 */
export const getPublicUrl = (filename) => {
    const firebaseConfig = JSON.parse(process.env.FIREBASE_CONFIG);
    const uri = encodeURIComponent(filename);
    return `https://firebasestorage.googleapis.com/v0/b/${firebaseConfig.storageBucket}/o/${uri}?alt=media`;
};
/**
 * Get file public url
 *
 * @param {string} filename
 * @return {string}
 */
export const getUrlAndGs = (filename) => {
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
 * @param {Stream} stream
 * @return {Promise}
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