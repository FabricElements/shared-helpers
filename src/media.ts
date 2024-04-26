/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import {Buffer} from 'buffer';
import type {Response} from 'express';
import {getStorage} from 'firebase-admin/storage';
import {logger} from 'firebase-functions/v2';
import fetch from 'node-fetch';
import sharp, {AvailableFormatInfo, ResizeOptions} from 'sharp';
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
    format?: 'jpeg' | 'png' | 'gif';
    input?: Buffer | Uint8Array | string | any;
    maxHeight?: number;
    maxWidth?: number;
    quality?: number;
    contentType?: string; // Only for internal use, it will be returned from storage
  }

  export type imageSizesType = null | string | 'thumbnail' | 'small' | 'medium' | 'standard' | 'high' | 'max';

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
     * @param {any} options
     */
    public static preview = async (options: {
      crop?: string;
      dpr?: number;
      height?: number;
      path?: string;
      file?: Uint8Array | ArrayBuffer;
      response: Response;
      robots?: boolean;
      size?: imageSizesType;
      width?: number;
      contentType?: string;
      cacheTime?: number;
      log?: boolean;
      quality?: number;
      // Minimum size in bytes to prevent small images from being resized
      minSize?: number;
      [key: string]: any,
    }) => {
      let {
        crop,
        height,
        path,
        dpr,
        response,
        robots,
        size,
        width,
        file,
        format,
        minSize,
        quality,
        log,
      } = options;
      if (file && path) throw new Error('You can only use file or path, not both');
      let cacheTime = options.cacheTime ?? 60;
      let mediaBuffer: any = null;
      let contentType = options.contentType ?? 'text/html';
      let minSizeBytes = minSize ?? 1000;
      response.set('Content-Type', contentType);
      // Don't use "/" at the start or end of your path
      if (path && path.startsWith('/')) {
        path = path.substring(1);
      }
      // const publicUrl = global.getUrlAndGs(mediaPath).url;
      let ok = true;
      let resized = false;
      const imageResizeOptions: InterfaceImageResize = {};
      /**
       * Define image size
       */
      const imageSize = Image.size(size);
      if (height) imageResizeOptions.maxHeight = height;
      if (width) imageResizeOptions.maxWidth = width;
      // Override size parameters if size is set
      if (size) {
        imageResizeOptions.maxHeight = imageSize.height;
        imageResizeOptions.maxWidth = imageSize.width;
      }
      if (crop || imageSize.size === 'thumbnail') {
        imageResizeOptions.crop = crop ?? 'entropy';
      }
      if (dpr) imageResizeOptions.dpr = dpr;
      if (format) imageResizeOptions.format = format;
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
      if (quality) imageResizeOptions.quality = quality;
      /// Check if image needs to be resized
      let needToResize = Object.values(imageResizeOptions).length > 0;
      let indexRobots = !!robots;
      if (path) {
        try {
          const fileRef = getStorage().bucket().file(path);
          const [exists] = await fileRef.exists();
          if (!exists) throw new Error('File not found');
          const [metadata]: any = await fileRef.getMetadata();
          contentType = metadata.contentType || null;
          const fileSize = metadata.size || 0;
          if (!contentType) {
            indexRobots = false;
            // noinspection ExceptionCaughtLocallyJS
            throw new Error('contentType is missing');
          }
          imageResizeOptions.contentType = contentType;
          if (fileSize === 0) {
            // noinspection ExceptionCaughtLocallyJS
            throw new Error('Media file is empty');
          }
          /// Check if file is too small to resize
          if (fileSize < minSizeBytes) {
            needToResize = false;
          }
          if (needToResize && contentTypeIsImageForSharp.test(contentType) && fileSize !== 'max') {
            if (log) logger.info(`Resizing ${path}`);
            /**
             * Handle images
             */
            // const isJPEG = contentTypeIsJPEG.test(contentType);
            // const format = isJPEG ? 'jpeg' : 'png';
            mediaBuffer = await Image.resize({
              ...imageResizeOptions,
              fileName: path,
            });
            resized = true;
            // contentType = `image/${format}`;
            indexRobots = true;
          } else {
            /**
             * Handle all media file types
             */
            [mediaBuffer] = await fileRef.download();
          }
        } catch (error) {
          ok = false;
          if (options.log) {
            logger.warn(`${path}:`, error.toString());
          }
        }
      }
      if (file && needToResize) {
        try {
          if (contentTypeIsImageForSharp.test(contentType)) {
            if (log) logger.info(`Resizing ${path}`);
            /**
             * Handle images
             */
            mediaBuffer = await Image.bufferImage({...imageResizeOptions, input: file});
            // contentType = `image/${format}`;
            indexRobots = true;
            resized = true;
          }
        } catch (e) {
          //
          ok = false;
        }
      }
      if (!indexRobots) {
        response.set('X-Robots-Tag', 'none'); // Prevent robots from indexing
      }
      if (!ok) {
        /**
         * End request for messages to prevent the provider sending messages with invalid media files
         */
        if (size === 'message') {
          logger.warn(`Can't find media file`);
          response.set('Cache-Control', 'no-cache, no-store, s-maxage=10, max-age=10, min-fresh=5, must-revalidate');
          response.status(404);
          response.end();
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
        response.set('Cache-Control', 'no-cache, no-store, s-maxage=10, max-age=10, min-fresh=5, must-revalidate');
      } else {
        response.status(200);
        response.set('Cache-Control', `immutable, public, max-age=${cacheTime}, s-maxage=${cacheTime * 2}, min-fresh=${cacheTime}`); // only cache if method changes to get
      }
      response.set('Content-Type', contentType);
      response.send(mediaBuffer);
      return null;
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
      // Set default values
      let outputFormat: AvailableFormatInfo;
      const formats = {
        avif: sharp.format.avif,
        dz: sharp.format.dz,
        fits: sharp.format.fits,
        gif: sharp.format.gif,
        heif: sharp.format.heif,
        input: sharp.format.input,
        jpeg: sharp.format.jpeg,
        jpg: sharp.format.jpeg,
        jp2: sharp.format.jp2,
        jxl: sharp.format.jxl,
        magick: sharp.format.magick,
        openslide: sharp.format.openslide,
        pdf: sharp.format.pdf,
        png: sharp.format.png,
        ppm: sharp.format.ppm,
        raw: sharp.format.raw,
        svg: sharp.format.svg,
        tiff: sharp.format.tiff,
        tif: sharp.format.tiff,
        v: sharp.format.v,
        webp: sharp.format.webp,
      };
      const formatsAsStings = Object.keys(formats);
      if (options.contentType) {
        const formatFromContentType = options.contentType.split('/').pop();
        if (formatsAsStings.includes(formatFromContentType)) {
          outputFormat = formats[formatFromContentType];
        }
      }
      if (options.format && formatsAsStings.includes(options.format)) {
        outputFormat = formats[options.format];
      }
      outputFormat ??= formats.jpeg;
      const animated = outputFormat === formats.gif;
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
