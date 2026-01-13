/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import { Buffer } from 'buffer';
import { getStorage } from 'firebase-admin/storage';
import { logger } from 'firebase-functions/v2';
import fetch from 'node-fetch';
import sharp from 'sharp';
import { contentTypeIsImageForSharp } from './regex.js';
import { emulator } from './variables.js';
/**
 * Media Namespace
 * @namespace Media
 * @description Media Namespace
 */
export var Media;
(function (Media) {
    var _a, _b;
    /**
     * Available Image Output Formats
     * @enum {string}
     */
    let AvailableOutputFormats;
    (function (AvailableOutputFormats) {
        AvailableOutputFormats["avif"] = "avif";
        AvailableOutputFormats["dz"] = "dz";
        AvailableOutputFormats["fits"] = "fits";
        AvailableOutputFormats["gif"] = "gif";
        AvailableOutputFormats["heif"] = "heif";
        AvailableOutputFormats["input"] = "input";
        AvailableOutputFormats["jpeg"] = "jpeg";
        AvailableOutputFormats["jp2"] = "jp2";
        AvailableOutputFormats["jxl"] = "jxl";
        AvailableOutputFormats["magick"] = "magick";
        AvailableOutputFormats["openslide"] = "openslide";
        AvailableOutputFormats["pdf"] = "pdf";
        AvailableOutputFormats["png"] = "png";
        AvailableOutputFormats["ppm"] = "ppm";
        AvailableOutputFormats["raw"] = "raw";
        AvailableOutputFormats["svg"] = "svg";
        AvailableOutputFormats["tiff"] = "tiff";
        AvailableOutputFormats["v"] = "v";
        AvailableOutputFormats["webp"] = "webp";
    })(AvailableOutputFormats = Media.AvailableOutputFormats || (Media.AvailableOutputFormats = {}));
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
    let ImageSize;
    (function (ImageSize) {
        ImageSize["thumbnail"] = "thumbnail";
        ImageSize["small"] = "small";
        ImageSize["medium"] = "medium";
        ImageSize["standard"] = "standard";
        ImageSize["high"] = "high";
        ImageSize["max"] = "max";
    })(ImageSize = Media.ImageSize || (Media.ImageSize = {}));
    /**
     * Set of predefined image sizes. The sizes are used to resize images.
     * @type {Record<ImageSize, {height: number; width: number;}>}
     * @property {number} height - Max height
     * @property {number} width - Max width
     * @property {ImageSize} size - Image size
     */
    Media.sizesObject = {
        thumbnail: {
            height: 200,
            width: 400,
        },
        small: {
            height: 200,
            width: 200,
        },
        medium: {
            height: 600,
            width: 600,
        },
        standard: {
            height: 1200,
            width: 1200,
        },
        high: {
            height: 1400,
            width: 1400,
        },
        max: {
            height: 1600,
            width: 1600,
        },
    };
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
        static async saveFromUrl(options) {
            const fileResponse = await fetch(options.url, {
                method: 'GET',
                redirect: 'follow',
                follow: 3,
                compress: true,
            });
            if (!fileResponse.ok)
                throw Error(`Can't fetch file`);
            const fileRef = getStorage().bucket().file(options.path);
            let blob = await fileResponse.arrayBuffer();
            const uint8Array = new Uint8Array(blob);
            const buffer = Buffer.from(uint8Array);
            const contentType = fileResponse.headers.get('content-type');
            await fileRef.save(buffer, { contentType: contentType });
            // TODO: check if uri is valid
            const uri = fileRef.cloudStorageURI.href;
            if (emulator)
                logger.log(`Saved file from url ${options.url} to ${uri}`);
            return {
                contentType: contentType,
                uri: uri,
            };
        }
    }
    _a = Helper;
    /**
     * Preview media file
     * @param {PreviewParams} options
     * @return {Promise<void>}
     */
    Helper.preview = async (options) => {
        if (options.file && options.path)
            throw new Error('You can only use file or path, not both');
        let cacheTime = Number(options.cacheTime ?? 60);
        let mediaBuffer = null;
        let contentType = options.contentType ?? 'text/html';
        let minSizeBytes = Number(options.minSize ?? 1000);
        const { request, response } = options;
        /// Set headers
        response.set('Content-Type', contentType);
        response.set('Access-Control-Allow-Methods', 'GET, OPTIONS, HEAD');
        switch (request.method) {
            case 'GET':
                break;
            case 'HEAD':
                response.set('Access-Control-Allow-Headers', 'Content-Type, Location, Content-Length');
                response.set('Access-Control-Max-Age', '3600'); // cache head for 3600s (1 hour)
                break;
            case 'OPTIONS':
                response.set('Access-Control-Allow-Headers', 'Content-Type, Location, Content-Length');
                response.set('Access-Control-Max-Age', '3600'); // cache preflight for 3600s (1 hour)
                response.sendStatus(204); // respond with 204 No Content and finish
                return;
            default:
                throw new Error('Method not allowed');
        }
        // Don't use "/" at the start or end of your path
        if (options.path && options.path.startsWith('/')) {
            options.path = options.path.substring(1);
        }
        let ok = true;
        const imageResizeOptions = {};
        /**
         * Define image size
         */
        const imageSize = Image.sizeObjectFromImageSize(options.size);
        if (options.height)
            imageResizeOptions.maxHeight = Number(options.height);
        if (options.width)
            imageResizeOptions.maxWidth = Number(options.width);
        // Override size parameters if size is set
        if (options.size) {
            imageResizeOptions.maxHeight = imageSize.height;
            imageResizeOptions.maxWidth = imageSize.width;
        }
        if (options.crop || imageSize.size === 'thumbnail') {
            imageResizeOptions.crop = options.crop ?? 'entropy';
        }
        if (options.dpr)
            imageResizeOptions.dpr = Number(options.dpr);
        if (options.format)
            imageResizeOptions.format = options.format;
        switch (imageSize.size) {
            case 'high':
                imageResizeOptions.quality = 90;
                break;
            case 'max':
                imageResizeOptions.quality = 100;
                break;
            // case 'thumbnail':
            // case 'small':
            // case 'medium':
            // case 'standard':
            default:
                imageResizeOptions.quality = 80;
                break;
        }
        if (options.quality)
            imageResizeOptions.quality = Number(options.quality);
        /// Check if image needs to be resized
        let needToResize = Object.values(imageResizeOptions).length > 0;
        let indexRobots = !!options.robots;
        if (options.path) {
            try {
                const fileRef = getStorage().bucket().file(options.path);
                const [exists] = await fileRef.exists();
                if (!exists)
                    throw new Error('File not found');
                const [metadata] = await fileRef.getMetadata();
                contentType = metadata.contentType || null;
                if (!contentType) {
                    indexRobots = false;
                    // noinspection ExceptionCaughtLocallyJS
                    throw new Error('contentType is missing');
                }
                const fileSize = metadata.size ?? 0;
                imageResizeOptions.contentType = contentType;
                if (fileSize === 0) {
                    // noinspection ExceptionCaughtLocallyJS
                    throw new Error('Media file is empty');
                }
                /// Check if file is too small to resize
                if (fileSize < minSizeBytes) {
                    needToResize = false;
                }
                if (options.size === 'max')
                    needToResize = false;
                if (needToResize && contentTypeIsImageForSharp.test(contentType)) {
                    if (options.log)
                        logger.info(`Resizing Image from path: ${options.path}`);
                    /**
                     * Handle images
                     */
                    const media = await Image.resize({
                        ...imageResizeOptions,
                        fileName: options.path,
                    });
                    mediaBuffer = media.buffer;
                    contentType = media.contentType;
                    indexRobots = true;
                    if (options.log)
                        logger.info(`Image was resized from path: ${options.path}`);
                }
                else {
                    /**
                     * Handle all media file types
                     */
                    [mediaBuffer] = await fileRef.download();
                }
            }
            catch (error) {
                ok = false;
                if (options.log)
                    logger.warn(`${options.path}:`, error.toString());
            }
        }
        if (options.file && needToResize) {
            try {
                if (contentTypeIsImageForSharp.test(contentType)) {
                    if (options.log)
                        logger.info('Resizing image file');
                    /**
                     * Handle images
                     */
                    const resizedImage = await Image.bufferImage({ ...imageResizeOptions, input: options.file });
                    mediaBuffer = resizedImage.buffer;
                    contentType = resizedImage.contentType;
                    indexRobots = true;
                    if (options.log)
                        logger.info('Image File was resized');
                }
            }
            catch (e) {
                if (options.log)
                    logger.error('Image File was not resized');
                ok = false;
            }
        }
        /// Set response headers
        if (ok) {
            response.status(200);
            response.set('Cache-Control', `immutable, public, max-age=${cacheTime}, s-maxage=${cacheTime * 2}, min-fresh=${cacheTime}`); // only cache if method changes to get
        }
        else {
            response.status(404);
            response.set('Cache-Control', 'no-cache, no-store, s-maxage=10, max-age=10, min-fresh=5, must-revalidate');
            indexRobots = false;
        }
        if (!indexRobots) {
            response.set('X-Robots-Tag', 'none'); // Prevent robots from indexing
        }
        if (!ok) {
            // End response if media file is not found
            if (!options.default) {
                response.end();
                return;
            }
            // Show default image if media file is not found
            const media = await Image.resize({
                fileName: 'default/error.jpg',
                format: AvailableOutputFormats.jpeg,
                ...imageResizeOptions,
            });
            mediaBuffer = media.buffer;
            contentType = media.contentType;
        }
        /// Set response headers
        response.set('Content-Type', contentType);
        // verify mediaBuffer is not null
        const bytes = mediaBuffer ? mediaBuffer.length : 0;
        /// Handle empty mediaBuffer
        if (!bytes || request.method === 'HEAD') {
            // set Content-Length with mediaBuffer length
            response.set('Content-Length', bytes.toString());
            response.sendStatus(204);
            return;
        }
        /// Send media file
        response.send(mediaBuffer);
    };
    /**
     * Save media file
     * @param {SaveParams} options
     * @return {Promise<void>}
     */
    Helper.save = async (options) => {
        const bucketRef = getStorage().bucket();
        const fileRef = bucketRef.file(options.path);
        const fileOptions = {
            contentType: options.contentType,
            resumable: false,
            validation: true,
            ...options.options,
        };
        await fileRef.save(options.media, fileOptions);
    };
    Media.Helper = Helper;
    /**
     * Image Helper
     * @class Image
     * @classdesc Image Helper
     */
    class Image {
    }
    _b = Image;
    /**
     * bufferImage
     * @param {InterfaceImageResize} options
     * @return {Promise<{contentType: string; buffer: Buffer}>}
     */
    Image.bufferImage = async (options) => {
        let outputFormat;
        const convertToFormatsEnum = (str) => {
            const colorValue = AvailableOutputFormats[str];
            return colorValue;
        };
        if (options.contentType) {
            const formatFromContentType = options.contentType.split('/').pop();
            outputFormat = convertToFormatsEnum(formatFromContentType);
        }
        if (options.format) {
            outputFormat = convertToFormatsEnum(options.format);
        }
        outputFormat ?? (outputFormat = AvailableOutputFormats.jpeg);
        const animated = outputFormat === AvailableOutputFormats.gif;
        let optionsImage = {};
        let dpr = options.dpr ?? 1;
        if (dpr > 6)
            dpr = 6;
        const crop = options.crop || options.maxHeight && options.maxWidth;
        // Set image size
        if (options.maxHeight || crop) {
            optionsImage.height = options.maxHeight * dpr;
        }
        if (options.maxWidth || crop) {
            optionsImage.width = options.maxWidth * dpr;
        }
        if (crop) {
            optionsImage.position = options.crop === 'attention' ? sharp.strategy.attention : sharp.strategy.entropy;
            optionsImage.fit = sharp.fit.cover;
        }
        else {
            optionsImage.withoutEnlargement = true;
            optionsImage.fit = sharp.fit.inside;
        }
        const base = sharp(options.input, {
            animated: animated,
        }).resize(optionsImage.width, optionsImage.height, optionsImage);
        let final = base;
        if (crop) {
            final = base.extract({ left: 0, top: 0, width: optionsImage.width, height: optionsImage.height });
        }
        // Add density information to the image
        final = final.withMetadata({ density: dpr * 72 });
        const result = final.toFormat(outputFormat, {
            force: true,
            quality: options.quality,
        }).toBuffer();
        return {
            buffer: await result,
            contentType: `image/${outputFormat}`,
        };
    };
    /**
     * Resize Images
     * @param {InterfaceImageResize} options
     * @return {Promise<{contentType: string; buffer: Buffer}>}
     */
    Image.resize = async (options) => {
        if (!options.fileName) {
            throw new Error('Google Cloud Storage path not found or invalid');
        }
        const fileRef = getStorage().bucket().file(options.fileName);
        const [fileObject] = await fileRef.download();
        return _b.bufferImage({ ...options, input: fileObject });
    };
    /**
     * Get default image size object when size is not set
     * @param {imageSizesType} inputSize
     * @return {{height: number, width: number, size: ImageSize}}
     */
    Image.sizeObjectFromImageSize = (inputSize) => {
        const sizeBase = ImageSize[inputSize] ?? ImageSize.standard;
        return {
            height: Media.sizesObject[sizeBase].height,
            width: Media.sizesObject[sizeBase].width,
            size: sizeBase,
        };
    };
    Media.Image = Image;
})(Media || (Media = {}));
//# sourceMappingURL=media.js.map