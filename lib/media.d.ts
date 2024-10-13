/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import { Buffer } from 'buffer';
import type { Response } from 'express';
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
         * Save From URL and return local path
         * @param {SaveFromUrlOptions} options
         * Returns storage uri (`gs://my-bucket/path`)
         * @return {Promise<SaveFromUrl>}
         */
        static saveFromUrl(options: SaveFromUrlOptions): Promise<SaveFromUrl>;
        /**
         * Preview media file
         * @param {PreviewParams} options
         * @return {Promise<void>}
         */
        static preview: (options: PreviewParams) => Promise<void>;
        /**
         * Save media file
         * @param {SaveParams} options
         * @return {Promise<void>}
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
         * bufferImage
         * @param {InterfaceImageResize} options
         * @return {Promise<{contentType: string; buffer: Buffer}>}
         */
        static bufferImage: (options: InterfaceImageResize) => Promise<{
            contentType: string;
            buffer: Buffer;
        }>;
        /**
         * Resize Images
         * @param {InterfaceImageResize} options
         * @return {Promise<{contentType: string; buffer: Buffer}>}
         */
        static resize: (options: InterfaceImageResize) => Promise<{
            contentType: string;
            buffer: Buffer;
        }>;
        /**
         * Get default image size object when size is not set
         * @param {imageSizesType} inputSize
         * @return {{height: number, width: number, size: ImageSize}}
         */
        static sizeObjectFromImageSize: (inputSize: ImageSize) => {
            height: number;
            width: number;
            size: ImageSize;
        };
    }
}
