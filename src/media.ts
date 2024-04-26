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

export namespace Media {
  /**
   * Save From URL Interface
   */
  export interface SaveFromUrl {
    contentType: string;
    uri: string;
  }

  export interface InterfaceImageResize {
    crop?: string; // force proportions and cut
    dpr?: number;
    fileName?: string;
    format?: AvailableOutputFormats;
    input?: Buffer | Uint8Array | string | any;
    maxHeight?: number;
    maxWidth?: number;
    quality?: number;
    contentType?: string; // Only for internal use, it will be returned from storage
  }

  /**
   * imageSizesType
   */
  export type imageSizesType = null | string | 'thumbnail' | 'small' | 'medium' | 'standard' | 'high' | 'max';

  /**
   * PreviewParams
   */
  interface PreviewParams {
    cacheTime?: number;
    contentType?: string;
    crop?: string;
    dpr?: number;
    file?: Uint8Array | ArrayBuffer;
    format?: Media.AvailableOutputFormats;
    height?: number;
    log?: boolean;
    minSize?: number;
    path?: string;
    quality?: number;
    response: Response;
    robots?: boolean;
    size?: Media.imageSizesType;
    width?: number;
  }

  /**
   * Media Helper
   */
  export class Helper {
    /**
     * Save From URL and return local path
     * @param {object} options
     * Returns storage uri (`gs://my-bucket/path`)
     * @return {Promise<SaveFromUrl>}
     */
    public static async saveFromUrl(options: { url: string, path: string }): Promise<Media.SaveFromUrl> {
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
      logger.log(`Saved file from url ${options.url} to ${uri}`);
      return {
        contentType: contentType,
        uri: uri,
      } as SaveFromUrl;
    }

    /**
     * Preview media file
     * @param {PreviewParams} options
     */
    public static preview = async (options: PreviewParams): Promise<void> => {
      if (options.file && options.path) throw new Error('You can only use file or path, not both');
      let cacheTime = options.cacheTime ?? 60;
      let mediaBuffer: any = null;
      let contentType = options.contentType ?? 'text/html';
      let minSizeBytes = options.minSize ?? 1000;
      options.response.set('Content-Type', contentType);
      // Don't use "/" at the start or end of your path
      if (options.path && options.path.startsWith('/')) {
        options.path = options.path.substring(1);
      }
      // const publicUrl = global.getUrlAndGs(mediaPath).url;
      let ok = true;
      const imageResizeOptions: InterfaceImageResize = {};
      /**
       * Define image size
       */
      const imageSize = Image.size(options.size);
      if (options.height) imageResizeOptions.maxHeight = options.height;
      if (options.width) imageResizeOptions.maxWidth = options.width;
      // Override size parameters if size is set
      if (options.size) {
        imageResizeOptions.maxHeight = imageSize.height;
        imageResizeOptions.maxWidth = imageSize.width;
      }
      if (options.crop || imageSize.size === 'thumbnail') {
        imageResizeOptions.crop = options.crop ?? 'entropy';
      }
      if (options.dpr) imageResizeOptions.dpr = options.dpr;
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
            mediaBuffer = await Image.resize({
              ...imageResizeOptions,
              fileName: options.path,
            });
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
          if (options.log) {
            logger.warn(`${options.path}:`, error.toString());
          }
        }
      }
      if (options.file && needToResize) {
        try {
          if (contentTypeIsImageForSharp.test(contentType)) {
            if (options.log) logger.info('Resizing image file');
            /**
             * Handle images
             */
            mediaBuffer = await Image.bufferImage({...imageResizeOptions, input: options.file});
            indexRobots = true;
            if (options.log) logger.info('Image File was resized');
          }
        } catch (e) {
          if (options.log) logger.error('Image File was not resized');
          //
          ok = false;
        }
      }
      if (!indexRobots) {
        options.response.set('X-Robots-Tag', 'none'); // Prevent robots from indexing
      }
      if (!ok) {
        /**
         * End request for messages to prevent the provider sending messages with invalid media files
         */
        if (options.size === 'message') {
          logger.warn(`Can't find media file`);
          options.response.set('Cache-Control', 'no-cache, no-store, s-maxage=10, max-age=10, min-fresh=5, must-revalidate');
          options.response.status(404);
          options.response.end();
          return;
        }
        mediaBuffer = await Image.resize({
          fileName: 'default/error.jpg',
          ...imageResizeOptions,
        });
        contentType = 'image/jpeg';
      }
      if (!mediaBuffer) {
        mediaBuffer = await Image.resize({
          fileName: 'default/default.jpg',
          ...imageResizeOptions,
        });
        contentType = 'image/jpeg';
        options.response.set('Cache-Control', 'no-cache, no-store, s-maxage=10, max-age=10, min-fresh=5, must-revalidate');
      } else {
        options.response.status(200);
        options.response.set('Cache-Control', `immutable, public, max-age=${cacheTime}, s-maxage=${cacheTime * 2}, min-fresh=${cacheTime}`); // only cache if method changes to get
      }
      options.response.set('Content-Type', contentType);
      options.response.send(mediaBuffer);
    };
    /**
     * Save media file
     * @param {any} options
     */
    public static save = async (options: {
      contentType: string;
      media: Buffer,
      options?: object;
      path?: string; // yourPath = yourPath/id. Don't use "/" at the start or end of your path
    }) => {
      const bucketRef = getStorage().bucket();
      const fileRef = bucketRef.file(options.path);
      const fileOptions: any = {
        contentType: options.contentType,
        resumable: false,
        validation: true,
        ...options.options,
      };
      // await fileRef.createWriteStream(fileOptions);
      await fileRef.save(options.media, fileOptions);
    };
  }

  /**
   * sizesObject
   * @type {object}
   * @return { [field: string]: { height: number; width: number; } }
   */
  export const sizesObject: Record<string, { height: number; width: number; }> = {
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
   * sizesOptionsArray
   * @type {string[]} sizesOptionsArray
   */
  export const sizesOptionsArray: string[] = Object.keys(sizesObject);

  /**
   * Available Output Formats
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
   * Image Helper
   * @param {any} options
   */
  export class Image {
    /**
     * bufferImage
     * @param {InterfaceImageResize} options
     * @return {Promise<Buffer>}
     */
    public static bufferImage = async (options: InterfaceImageResize): Promise<Buffer> => {
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
      let dpr = Number(options.dpr ?? 1);
      if (dpr > 3) {
        dpr = 3;
      }
      const crop = options.maxHeight && options.maxWidth || options.crop;
      if (options.maxHeight || crop) {
        optionsImage.height = options.maxHeight * dpr || 800;
      }
      if (options.maxWidth || crop) {
        optionsImage.width = options.maxWidth * dpr || 800;
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
      return final.toFormat(outputFormat, {
        quality: options.quality || 90,
        force: true,
      }).toBuffer();
    };

    /**
     * Resize Images
     * @param {InterfaceImageResize} options
     * @return {Promise<Buffer>}
     */
    public static resize = async (options: InterfaceImageResize): Promise<Buffer> => {
      if (!options.fileName) {
        throw new Error('Google Cloud Storage path not found or invalid');
      }
      const fileRef = getStorage().bucket().file(options.fileName);
      const [fileObject] = await fileRef.download();
      return Image.bufferImage({...options, input: fileObject});
    };

    /**
     * Get default image size
     * @param {imageSizesType} inputSize
     * @return {any}
     */
    public static size = (inputSize: imageSizesType): { height: number, width: number, size: string } => {
      const sizeBase = inputSize && sizesOptionsArray.indexOf(inputSize) >= 0 ? inputSize : 'standard';
      return {
        height: sizesObject[sizeBase].height,
        width: sizesObject[sizeBase].width,
        size: sizeBase,
      };
    };
  }
}
