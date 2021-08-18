/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import type express from "express";
import * as admin from "firebase-admin";
import {ImageHelper} from "./image-helper";
import {imageSizesType, InterfaceImageResize} from "./interfaces";
import {contentTypeIsImageForSharp, contentTypeIsJPEG} from "./regex.js";

export class MediaHelper {
  firebaseConfig: any;
  isBeta: boolean;

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
    crop?: boolean;
    id: string;
    isCrawler?: boolean;
    path?: string; // yourPath = yourPath/id. Don't use "/" at the start or end of your path
    request: express.Request;
    response: express.Response;
    size?: imageSizesType;
  }) => {
    const {response} = options;
    const _cacheTime = this.isBeta ? 60 : 86400; // 1 day in seconds
    const id = options.id;
    let mediaBuffer: any = null;
    let contentType = "text/html";
    response.set("Content-Type", contentType);
    const mediaPath = options.path ? `${options.path}/${id}` : id;
    const imageHelper = new ImageHelper({
      firebaseConfig: this.firebaseConfig,
      isBeta: this.isBeta,
    });
    // const publicUrl = global.getUrlAndGs(mediaPath).url;
    const fileRef = admin.storage().bucket(this.firebaseConfig.storageBucket).file(mediaPath);
    const imageResizeOptions: InterfaceImageResize = {};
    let ok = true;
    /**
     * Define image size
     */
    const imageSize = imageHelper.size(options.size);
    imageResizeOptions.maxHeight = imageSize.height;
    imageResizeOptions.maxWidth = imageSize.width;

    if (options.crop || imageSize.size === "thumbnail") {
      imageResizeOptions.crop = true;
    }

    switch (imageSize.size) {
      case "thumbnail":
      case "small":
      case "medium":
      case "standard":
        imageResizeOptions.quality = 80;
        break;
      case "high":
        imageResizeOptions.quality = 90;
        break;
      case "max":
        imageResizeOptions.quality = 100;
    }
    let indexRobots: boolean = false;
    try {
      const [metadata]: any = await fileRef.getMetadata();
      contentType = metadata.contentType || null;
      const fileSize = metadata.size || 0;
      if (!contentType) {
        throw new Error("contentType is missing");
      }
      if (fileSize === 0) {
        throw new Error("Media file is empty");
      }
      if (contentTypeIsImageForSharp.test(contentType) && fileSize !== "max") {
        /**
         * Handle images
         */
        const isJPEG = contentTypeIsJPEG.test(contentType);
        const format = isJPEG ? "jpeg" : "png";
        mediaBuffer = await imageHelper.resize({
          ...imageResizeOptions,
          fileName: mediaPath,
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
        console.warn(`link/${id}:`, error.message);
      }
    }
    if (!indexRobots) {
      response.set("X-Robots-Tag", "none"); // Prevent robots from indexing
    }
    if (!ok) {
      /**
       * End request for messages to prevent the provider sending messages with invalid media files
       */
      if (options.size === "message") {
        console.warn("Can't find media file");
        response.set("Cache-Control", "no-cache, no-store, s-maxage=10, max-age=10, min-fresh=5, must-revalidate");
        response.status(404);
        response.end();
        return;
      }
      mediaBuffer = await imageHelper.resize({
        fileName: "images/error.jpg",
        ...imageResizeOptions,
      });
      contentType = "image/jpeg";
    }
    if (!mediaBuffer) {
      mediaBuffer = await imageHelper.resize({
        fileName: "images/default.jpg",
        ...imageResizeOptions,
      });
      contentType = "image/jpeg";
      response.set("Cache-Control", "no-cache, no-store, s-maxage=10, max-age=10, min-fresh=5, must-revalidate");
    } else {
      response.status(200);
      response.set("Cache-Control", `immutable, public, max-age=${_cacheTime}, s-maxage=${_cacheTime * 2}, min-fresh=${_cacheTime}`); // only cache if method changes to get
    }
    response.set("Content-Type", contentType);
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
      id: string;
      media: Buffer,
      options?: object;
      path?: string; // yourPath = yourPath/id. Don't use "/" at the start or end of your path
    }) => {
      const bucketRef = admin.storage().bucket(this.firebaseConfig.storageBucket);
      const filePath = `${options.path}/${options.id}`;
      const fileRef = bucketRef.file(filePath);
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
