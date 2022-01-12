/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import type {Response} from 'express';
import * as admin from 'firebase-admin';
import {ImageHelper} from './image-helper';
import type {imageSizesType, InterfaceImageResize} from './interfaces';
import {contentTypeIsImageForSharp, contentTypeIsJPEG} from './regex.js';

if (!admin.apps.length) {
  admin.initializeApp();
}

/**
 * MediaHelper
 */
export class MediaHelper {
  firebaseConfig: any;
  isBeta: boolean;

  /**
   * @param {any} config
   */
  constructor(config?: {
    firebaseConfig?: any,
    isBeta?: boolean
  }) {
    if (config && Object.keys(config).length > 0) {
      this.firebaseConfig = config.firebaseConfig;
      this.isBeta = !!config.isBeta;
    }
  }

  /**
   * Preview media file
   * @param {any} options
   */
  public preview = async (options: {
    [key: string]: any,
    crop?: string;
    dpr?: number,
    height?: number,
    path: string;
    response: Response;
    robots?: boolean,
    size?: imageSizesType;
    width?: number,
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
    } = options;
    const _cacheTime = this.isBeta ? 60 : 86400; // 1 day in seconds
    let mediaBuffer: any = null;
    let contentType = 'text/html';
    response.set('Content-Type', contentType);
    // Don't use "/" at the start or end of your path
    if (path.startsWith('/')) {
      path = path.substring(1);
    }
    const imageHelper = new ImageHelper({
      firebaseConfig: this.firebaseConfig,
      isBeta: this.isBeta,
    });
    // const publicUrl = global.getUrlAndGs(mediaPath).url;
    const fileRef = admin.storage().bucket(this.firebaseConfig.storageBucket).file(path);
    let ok = true;
    const imageResizeOptions: InterfaceImageResize = {};
    /**
     * Define image size
     */
    const imageSize = imageHelper.size(size);
    imageResizeOptions.maxHeight = height ? Math.floor(height) : imageSize.height;
    imageResizeOptions.maxWidth = width ? Math.floor(width) : imageSize.width;
    if (crop || imageSize.size === 'thumbnail') {
      imageResizeOptions.crop = crop ?? 'entropy';
    }
    if (dpr) {
      imageResizeOptions.dpr = dpr;
    }
    switch (imageSize.size) {
      case 'thumbnail':
      case 'small':
      case 'medium':
      case 'standard':
        imageResizeOptions.quality = 80;
        break;
      case 'high':
        imageResizeOptions.quality = 90;
        break;
      case 'max':
        imageResizeOptions.quality = 100;
    }
    let indexRobots: boolean = !!robots;
    try {
      const [metadata]: any = await fileRef.getMetadata();
      contentType = metadata.contentType || null;
      const fileSize = metadata.size || 0;
      if (!contentType) {
        throw new Error('contentType is missing');
      }
      if (fileSize === 0) {
        throw new Error('Media file is empty');
      }
      if (contentTypeIsImageForSharp.test(contentType) && fileSize !== 'max') {
        /**
         * Handle images
         */
        const isJPEG = contentTypeIsJPEG.test(contentType);
        const format = isJPEG ? 'jpeg' : 'png';
        mediaBuffer = await imageHelper.resize({
          ...imageResizeOptions,
          fileName: path,
          format,
        });
        contentType = `image/${format}`;
        indexRobots = true;
      } else {
        /**
         * Handle all media file types
         */
        [mediaBuffer] = await fileRef.download();
      }
    } catch (error) {
      ok = false;
      if (this.isBeta) {
        console.warn(`${path}:`, error.message);
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
        console.warn('Can\'t find media file');
        response.set('Cache-Control', 'no-cache, no-store, s-maxage=10, max-age=10, min-fresh=5, must-revalidate');
        response.status(404);
        response.end();
        return;
      }
      mediaBuffer = await imageHelper.resize({
        fileName: 'media/default/error.jpg',
        ...imageResizeOptions,
      });
      contentType = 'image/jpeg';
    }
    if (!mediaBuffer) {
      mediaBuffer = await imageHelper.resize({
        fileName: 'media/default/default.jpg',
        ...imageResizeOptions,
      });
      contentType = 'image/jpeg';
      response.set('Cache-Control', 'no-cache, no-store, s-maxage=10, max-age=10, min-fresh=5, must-revalidate');
    } else {
      response.status(200);
      response.set('Cache-Control', `immutable, public, max-age=${_cacheTime}, s-maxage=${_cacheTime * 2}, min-fresh=${_cacheTime}`); // only cache if method changes to get
    }
    response.set('Content-Type', contentType);
    response.send(mediaBuffer);
    return null;
  };
  /**
   * Preview media file
   * @param {any} options
   */
  public save =
    async (options: {
      contentType: string;
      media: Buffer,
      options?: object;
      path?: string; // yourPath = yourPath/id. Don't use "/" at the start or end of your path
    }) => {
      const bucketRef = admin.storage().bucket(this.firebaseConfig.storageBucket);
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
