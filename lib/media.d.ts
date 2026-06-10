/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import { Buffer } from 'buffer';
import type { Request, Response } from 'express';
/**
 * Media Namespace
 * @namespace Media
 * @description Media Namespace
 */
export declare namespace Media {
    /**
     * Available Image Output Formats
     * @enum {string}
     */
    enum AvailableOutputFormats {
        avif = "avif",
        dz = "dz",
        fits = "fits",
        gif = "gif",
        heif = "heif",
        input = "input",
        jpeg = "jpeg",
        jp2 = "jp2",
        jxl = "jxl",
        magick = "magick",
        openslide = "openslide",
        pdf = "pdf",
        png = "png",
        ppm = "ppm",
        raw = "raw",
        svg = "svg",
        tiff = "tiff",
        v = "v",
        webp = "webp"
    }
    /**
     * Set of predefined image sizes
     * @enum {string}
     * @property {string} thumbnail - thumbnail size 200x400
     * @property {string} small - small size 200x200
     * @property {string} medium - medium size 600x600
     * @property {string} standard - standard size 1200x1200
     * @property {string} high - high size 1400x1400
     * @property {string} max - max size 1600x1600
     */
    enum ImageSize {
        thumbnail = "thumbnail",
        small = "small",
        medium = "medium",
        standard = "standard",
        high = "high",
        max = "max"
    }
    /**
     * SaveFromUrlOptions
     * @interface SaveFromUrlOptions
     * @property {string} url - url
     * @property {string} path - Storage path to save the media file
     */
    interface SaveFromUrlOptions {
        url: string;
        path: string;
    }
    /**
     * Save From URL Interface
     * @interface SaveFromUrl
     * @property {string} contentType - content type
     * @property {string} uri - uri
     */
    interface SaveFromUrl {
        contentType: string;
        uri: string;
    }
    /**
     * InterfaceImageResize
     * @interface InterfaceImageResize
     * @property {string} [crop] - force proportions and cut
     * @property {number} [dpr] - device pixel ratio
     * @property {string} [fileName] - file name
     * @property {AvailableOutputFormats} [format] - output format
     * @property {Buffer | Uint8Array | string | any} [input] - input
     * @property {number} [maxHeight] - max height
     * @property {number} [maxWidth] - max width
     * @property {number} [quality] - quality
     * @property {string} [contentType] - content type
     */
    interface InterfaceImageResize {
        crop?: string;
        dpr?: number;
        fileName?: string;
        format?: AvailableOutputFormats;
        input?: Buffer | Uint8Array | string | any;
        maxHeight?: number;
        maxWidth?: number;
        quality?: number;
        contentType?: string;
    }
    /**
     * PreviewParams
     * @interface PreviewParams
     * @property {number} [cacheTime] - cache time
     * @property {string} [contentType] - content type
     * @property {string} [crop] - force proportions and cut
     * @property {number} [dpr] - device pixel ratio
     * @property {Uint8Array | ArrayBuffer} [file] - file
     * @property {AvailableOutputFormats} [format] - output format
     * @property {number} [height] - Image resize max height
     * @property {boolean} [log] - log messages
     * @property {number} [minSize] - The minimum size in bytes to resize the image
     * @property {string} [path] - The storage path to the media file
     * @property {number} [quality] - image quality (0-100)
     * @property {Response} response - Express Response object
     * @property {boolean} [robots] - Index headers for robots, default is false
     * @property {ImageSize} [size] - Set of size options
     * @property {number} [width] - Image resize max width
     * @property {boolean} [default] - Show default image if media file is not found, default is false
     */
    interface PreviewParams {
        cacheTime?: number;
        contentType?: string;
        crop?: string;
        dpr?: number;
        file?: Uint8Array | ArrayBuffer;
        format?: AvailableOutputFormats;
        height?: number;
        log?: boolean;
        minSize?: number;
        path?: string;
        quality?: number;
        request: Request;
        response: Response;
        robots?: boolean;
        size?: ImageSize;
        width?: number;
        default?: boolean;
    }
    /**
     * SaveParams
     * @interface SaveParams
     * @property {string} contentType - content type
     * @property {Buffer} media - media
     * @property {object} [options] - options
     * @property {string} [path] - path. Default is root. Example: `path/to/file.jpg`. Don't use "/" at the start or end of your path
     */
    interface SaveParams {
        contentType: string;
        media: Buffer;
        options?: object;
        path?: string;
    }
    /**
     * Set of predefined image sizes. The sizes are used to resize images.
     * @type {Record<ImageSize, {height: number; width: number;}>}
     * @property {number} height - Max height
     * @property {number} width - Max width
     * @property {ImageSize} size - Image size
     */
    const sizesObject: Record<ImageSize, {
        height: number;
        width: number;
    }>;
    /**
     * Media Helper
     * @class Helper
     * @classdesc Media Helper
     */
    class Helper {
        /**
         * Downloads a remote file by URL and saves it to Firebase Cloud Storage.
         *
         * Performs a `GET` request (following up to 3 redirects) to `options.url`,
         * converts the response body to a `Buffer`, and saves it to the storage path
         * specified by `options.path` using the response's `content-type` header.
         * Logs the resulting `gs://` URI when running in the emulator.
         *
         * @param {SaveFromUrlOptions} options - Download and storage options.
         * @returns {Promise<SaveFromUrl>} A Promise resolving to an object with `contentType`
         *   (the MIME type from the response) and `uri` (the `gs://` Cloud Storage URI).
         * @throws {Error} When the HTTP response status is not `ok`.
         */
        static saveFromUrl(options: SaveFromUrlOptions): Promise<SaveFromUrl>;
        /**
         * Serves a media file from Firebase Storage or a raw buffer via an Express response.
         *
         * Handles `GET`, `HEAD`, and `OPTIONS` HTTP methods.  When `path` is supplied the
         * file is retrieved from Firebase Storage; when `file` is supplied a raw buffer is
         * used instead (mutually exclusive).  Images matching `contentTypeIsImageForSharp`
         * are resized using the `sharp` pipeline before transmission.  On failure (file not
         * found, empty file, or resize error) the response status is set to `404`; if
         * `options.default` is `true` a default error image is served instead of an empty
         * body.  Appropriate `Cache-Control` and `X-Robots-Tag` headers are set on every
         * response path.
         *
         * @param {PreviewParams} options - Preview configuration including the Express
         *   request/response pair, storage path or raw file buffer, image sizing options,
         *   cache duration, and robot indexing preference.
         * @returns {Promise<void>} A Promise that resolves when the response has been sent.
         * @throws {Error} When both `file` and `path` are provided simultaneously, or when
         *   the HTTP method is not `GET`, `HEAD`, or `OPTIONS`.
         */
        static preview: (options: PreviewParams) => Promise<void>;
        /**
         * Saves a media buffer to Firebase Cloud Storage under the specified path.
         *
         * Uploads the buffer non-resumably with MD5 validation enabled.  Extra storage
         * options (e.g., custom metadata) can be merged via `options.options`.
         *
         * @param {SaveParams} options - Save parameters including the target path,
         *   MIME content type, media buffer, and optional storage save options.
         * @returns {Promise<void>} A Promise that resolves when the upload completes.
         */
        static save: (options: SaveParams) => Promise<void>;
    }
    /**
     * Image Helper
     * @class Image
     * @classdesc Image Helper
     */
    class Image {
        /**
         * Resizes, converts, and returns a media buffer and its resulting MIME type.
         *
         * Determines the output format from `options.contentType` (falling back to
         * `options.format`, then `jpeg`), constructs `sharp` resize options based on
         * `maxWidth`, `maxHeight`, DPR scaling, and the `crop` strategy, then converts
         * the input to the target format at the requested quality.  Animated GIF
         * processing is enabled automatically when the output format is `gif`.
         *
         * @param {InterfaceImageResize} options - Resize and conversion options including
         *   the input buffer or path, target dimensions, crop mode, DPR, output format,
         *   and quality.
         * @returns {Promise<{contentType: string; buffer: Buffer}>} A Promise resolving to an
         *   object with the output `buffer` and the corresponding `contentType` string.
         */
        static bufferImage: (options: InterfaceImageResize) => Promise<{
            contentType: string;
            buffer: Buffer;
        }>;
        /**
         * Downloads an image from Firebase Storage and returns a resized buffer.
         *
         * Retrieves the file at `options.fileName` from the default storage bucket,
         * then delegates to `bufferImage` for the resize and format conversion.
         *
         * @param {InterfaceImageResize} options - Resize options; `fileName` must be a
         *   valid Cloud Storage object path.
         * @returns {Promise<{contentType: string; buffer: Buffer}>} A Promise resolving to the
         *   resized image buffer and its MIME content type.
         * @throws {Error} When `options.fileName` is absent or the file cannot be downloaded.
         */
        static resize: (options: InterfaceImageResize) => Promise<{
            contentType: string;
            buffer: Buffer;
        }>;
        /**
         * Resolves a named `ImageSize` enum value to a concrete `{height, width, size}` object.
         *
         * Falls back to `ImageSize.standard` when `inputSize` is not a recognised enum member,
         * ensuring callers always receive a valid dimension set.
         *
         * @param {ImageSize} inputSize - A member of the `ImageSize` enum (e.g., `ImageSize.medium`).
         * @returns {{height: number, width: number, size: ImageSize}} An object with the pixel
         *   `height`, `width`, and the resolved `size` enum value.
         */
        static sizeObjectFromImageSize: (inputSize: ImageSize) => {
            height: number;
            width: number;
            size: ImageSize;
        };
    }
}
