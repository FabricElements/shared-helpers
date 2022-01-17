"use strict";
/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.streamToBuffer = exports.getUrlAndGs = exports.getPublicUrl = exports.timeout = void 0;
/**
 * Timeout
 * @param {number} ms
 * @return {Promise<any>}
 */
const timeout = (ms) => new Promise((res) => setTimeout(res, ms));
exports.timeout = timeout;
/**
 * Get file public url
 *
 * @param {string} filename
 * @return {string}
 */
const getPublicUrl = (filename) => {
    const firebaseConfig = JSON.parse(process.env.FIREBASE_CONFIG);
    const uri = encodeURIComponent(filename);
    return `https://firebasestorage.googleapis.com/v0/b/${firebaseConfig.storageBucket}/o/${uri}?alt=media`;
};
exports.getPublicUrl = getPublicUrl;
/**
 * Get file public url
 *
 * @param {string} filename
 * @return {string}
 */
const getUrlAndGs = (filename) => {
    const firebaseConfig = JSON.parse(process.env.FIREBASE_CONFIG);
    const uri = encodeURIComponent(filename);
    const bucketName = firebaseConfig.storageBucket;
    const url = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${uri}?alt=media`;
    return {
        gs: filename,
        url,
    };
};
exports.getUrlAndGs = getUrlAndGs;
/**
 * Stream to buffer
 * Use on buffer media files and pipe functions
 * @param {Stream} stream
 * @return {Promise}
 */
const streamToBuffer = (stream) => {
    return new Promise((resolve, reject) => {
        const buffers = [];
        stream.on('error', reject);
        stream.on('data', (data) => buffers.push(data));
        stream.on('end', () => resolve(Buffer.concat(buffers)));
    });
};
exports.streamToBuffer = streamToBuffer;
//# sourceMappingURL=global.js.map