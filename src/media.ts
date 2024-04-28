/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import {Buffer} from 'buffer';
import type {Response} from 'express';
import {getStorage} from 'firebase-admin/storage';
import {logger} from 'firebase-functions/v2';
import fetch from 'node-fetch';
import sharp, {ResizeOptions} from 'sharp';
import {contentTypeIsImageForSharp} from './regex.js';
import {emulator} from './variables.js';

/**
 * Media Namespace
 * @namespace Media
 * @description Media Namespace
 */
export namespace Media {
  /**
   * Available Image Output Formats
   * @enum {string}
   */
  export enum AvailableOutputFormats {
    avif = 'avif',
    dz = 'dz',
    fits = 'fits',
    gif = 'gif',
    heif = 'heif',
    input = 'input',
    jpeg = 'jpeg',
    jp2 = 'jp2',
    jxl = 'jxl',
    magick = 'magick',
    openslide = 'openslide',
    pdf = 'pdf',
    png = 'png',
    ppm = 'ppm',
    raw = 'raw',
    svg = 'svg',
    tiff = 'tiff',
    v = 'v',
    webp = 'webp',
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
  export enum ImageSize {
    thumbnail = 'thumbnail',
    small = 'small',
    medium = 'medium',
    standard = 'standard',
    high = 'high',
    max = 'max',
  }

  /**
   * SaveFromUrlOptions
   * @interface SaveFromUrlOptions
   * @property {string} url - url
   * @property {string} path - Storage path to save the media file
   */
  export interface SaveFromUrlOptions {
    url: string;
    path: string;
  }

  /**
   * Save From URL Interface
   * @interface SaveFromUrl
   * @property {string} contentType - content type
   * @property {string} uri - uri
   */
  export interface SaveFromUrl {
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
  export interface InterfaceImageResize {
    crop?: string; // force proportions and cut
    dpr?: number; // device pixel ratio
    fileName?: string;
    format?: AvailableOutputFormats;
    input?: Buffer | Uint8Array | string | any;
    maxHeight?: number;
    maxWidth?: number;
    quality?: number;
    contentType?: string; // Only for internal use, it will be returned from storage
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
  export interface PreviewParams {
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
  export interface SaveParams {
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
  export const sizesObject: Record<ImageSize, { height: number; width: number; }> = {
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
  export class Helper {
    /**
     * Save From URL and return local path
     * @param {SaveFromUrlOptions} options
     * Returns storage uri (`gs://my-bucket/path`)
     * @return {Promise<SaveFromUrl>}
     */
    public static async saveFromUrl(options: SaveFromUrlOptions): Promise<SaveFromUrl> {
      const fileResponse = await fetch(options.url, {
        method: 'GET',
        redirect: 'follow',
        follow: 3,
        compress: true,
      });
      if (!fileResponse.ok) throw Error(`Can't fetch file`);
      const fileRef = getStorage().bucket().file(options.path);
      let blob = await fileResponse.arrayBuffer();
      const uint8Array = new Uint8Array(blob);
      const buffer = Buffer.from(uint8Array);
      const contentType: string = fileResponse.headers.get('content-type');
      await fileRef.save(buffer, {contentType: contentType});
      // TODO: check if uri is valid
      const uri = fileRef.cloudStorageURI.href;
      if (emulator) logger.log(`Saved file from url ${options.url} to ${uri}`);
      return {
        contentType: contentType,
        uri: uri,
      } as SaveFromUrl;
    }

    /**
     * Preview media file
     * @param {PreviewParams} options
     * @return {Promise<void>}
     */
    public static preview = async (options: PreviewParams): Promise<void> => {
      if (options.file && options.path) throw new Error('You can only use file or path, not both');
      let cacheTime = Number(options.cacheTime ?? 60);
      let mediaBuffer: Buffer = null;
      let contentType = options.contentType ?? 'text/html';
      let minSizeBytes = Number(options.minSize ?? 1000);
      options.response.set('Content-Type', contentType);
      // Don't use "/" at the start or end of your path
      if (options.path && options.path.startsWith('/')) {
        options.path = options.path.substring(1);
      }
      let ok = true;
      const imageResizeOptions: InterfaceImageResize = {};
      /**
       * Define image size
       */
      const imageSize = Image.sizeObjectFromImageSize(options.size);
      if (options.height) imageResizeOptions.maxHeight = Number(options.height);
      if (options.width) imageResizeOptions.maxWidth = Number(options.width);
      // Override size parameters if size is set
      if (options.size) {
        imageResizeOptions.maxHeight = imageSize.height;
        imageResizeOptions.maxWidth = imageSize.width;
      }
      if (options.crop || imageSize.size === 'thumbnail') {
        imageResizeOptions.crop = options.crop ?? 'entropy';
      }
      if (options.dpr) imageResizeOptions.dpr = Number(options.dpr);
      if (options.format) imageResizeOptions.format = options.format;
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
      if (options.quality) imageResizeOptions.quality = options.quality;
      /// Check if image needs to be resized
      let needToResize = Object.values(imageResizeOptions).length > 0;
      let indexRobots = !!options.robots;
      if (options.path) {
        try {
          const fileRef = getStorage().bucket().file(options.path);
          const [exists] = await fileRef.exists();
          if (!exists) throw new Error('File not found');
          const [metadata]: any = await fileRef.getMetadata();
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
          if (options.size === 'max') needToResize = false;
          if (needToResize && contentTypeIsImageForSharp.test(contentType)) {
            if (options.log) logger.info(`Resizing Image from path: ${options.path}`);
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
            if (options.log) logger.info(`Image was resized from path: ${options.path}`);
          } else {
            /**
             * Handle all media file types
             */
            [mediaBuffer] = await fileRef.download();
          }
        } catch (error) {
          ok = false;
          if (options.log) logger.warn(`${options.path}:`, error.toString());
        }
      }
      if (options.file && needToResize) {
        try {
          if (contentTypeIsImageForSharp.test(contentType)) {
            if (options.log) logger.info('Resizing image file');
            /**
             * Handle images
             */
            const resizedImage = await Image.bufferImage({...imageResizeOptions, input: options.file});
            mediaBuffer = resizedImage.buffer;
            contentType = resizedImage.contentType;
            indexRobots = true;
            if (options.log) logger.info('Image File was resized');
          }
        } catch (e) {
          if (options.log) logger.error('Image File was not resized');
          ok = false;
        }
      }
      /// Set response headers
      if (ok) {
        options.response.status(200);
        options.response.set('Cache-Control', `immutable, public, max-age=${cacheTime}, s-maxage=${cacheTime * 2}, min-fresh=${cacheTime}`); // only cache if method changes to get
      } else {
        options.response.status(404);
        options.response.set('Cache-Control', 'no-cache, no-store, s-maxage=10, max-age=10, min-fresh=5, must-revalidate');
        indexRobots = false;
      }
      if (!indexRobots) {
        options.response.set('X-Robots-Tag', 'none'); // Prevent robots from indexing
      }
      if (!ok) {
        // End response if media file is not found
        if (!options.default) {
          options.response.end();
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
      options.response.set('Content-Type', contentType);
      /// Send media file
      options.response.send(mediaBuffer);
    };
    /**
     * Save media file
     * @param {SaveParams} options
     * @return {Promise<void>}
     */
    public static save = async (options: SaveParams): Promise<void> => {
      const bucketRef = getStorage().bucket();
      const fileRef = bucketRef.file(options.path);
      const fileOptions: any = {
        contentType: options.contentType,
        resumable: false,
        validation: true,
        ...options.options,
      };
      await fileRef.save(options.media, fileOptions);
    };
  }

  /**
   * Image Helper
   * @class Image
   * @classdesc Image Helper
   */
  export class Image {
    /**
     * bufferImage
     * @param {InterfaceImageResize} options
     * @return {Promise<{contentType: string; buffer: Buffer}>}
     */
    public static bufferImage = async (options: InterfaceImageResize): Promise<{
      contentType: string;
      buffer: Buffer;
    }> => {
      let outputFormat: AvailableOutputFormats;
      const convertToFormatsEnum = (str: string): AvailableOutputFormats | undefined => {
        const colorValue = AvailableOutputFormats[str as keyof typeof AvailableOutputFormats];
        return colorValue;
      };
      if (options.contentType) {
        const formatFromContentType = options.contentType.split('/').pop();
        outputFormat = convertToFormatsEnum(formatFromContentType);
      }
      if (options.format) {
        outputFormat = convertToFormatsEnum(options.format);
      }
      outputFormat ??= AvailableOutputFormats.jpeg;
      const animated = outputFormat === AvailableOutputFormats.gif;
      let optionsImage: ResizeOptions = {};
      let dpr = options.dpr ?? 1;
      if (dpr > 3) dpr = 3;
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
      } else {
        optionsImage.withoutEnlargement = true;
        optionsImage.fit = sharp.fit.inside;
      }
      const base = sharp(options.input, {
        animated: animated,
      }).resize(optionsImage.width, optionsImage.height, optionsImage);
      let final = base;
      if (crop) {
        final = base.extract({left: 0, top: 0, width: optionsImage.width, height: optionsImage.height});
      }
      // Add density information to the image
      final = final.withMetadata({density: dpr * 72});
      const result = final.toFormat(outputFormat, {
        quality: options.quality || 90,
        force: true,
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
    public static resize = async (options: InterfaceImageResize): Promise<{ contentType: string; buffer: Buffer }> => {
      if (!options.fileName) {
        throw new Error('Google Cloud Storage path not found or invalid');
      }
      const fileRef = getStorage().bucket().file(options.fileName);
      const [fileObject] = await fileRef.download();
      return Image.bufferImage({...options, input: fileObject});
    };

    /**
     * Get default image size object when size is not set
     * @param {imageSizesType} inputSize
     * @return {{height: number, width: number, size: ImageSize}}
     */
    static sizeObjectFromImageSize = (inputSize: ImageSize): { height: number, width: number, size: ImageSize } => {
      const sizeBase: ImageSize = ImageSize[inputSize] ?? ImageSize.standard;
      return {
        height: sizesObject[sizeBase].height,
        width: sizesObject[sizeBase].width,
        size: sizeBase,
      };
    };
  }
}
