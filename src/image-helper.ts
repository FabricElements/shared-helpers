/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import * as admin from "firebase-admin";
import sharp from "sharp";
import {imageSizesType, InterfaceImageResize} from "./interfaces";

if (!admin.apps.length) {
  admin.initializeApp();
}

export class ImageHelper {
  firebaseConfig: any;
  isBeta: boolean;

  public sizesObject: { [field: string]: { height: number; width: number; } } = {
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
  public sizesOptionsArray = Object.keys(this.sizesObject);

  constructor(config?: {
    firebaseConfig?: any,
    isBeta?: boolean
  }) {
    if (config && Object.keys(config).length > 0) {
      this.firebaseConfig = config.firebaseConfig;
      this.isBeta = !!config.isBeta;
    }
  }

  public bufferImage = async (options: InterfaceImageResize) => {
    let optionsImage: any = {};
    if (options.maxHeight || options.crop) {
      optionsImage.height = options.maxHeight || 800;
    }
    if (options.maxWidth || options.crop) {
      optionsImage.width = options.maxWidth || 800;
    }
    if (options.crop) {
      optionsImage.position = sharp.strategy.entropy;
      optionsImage.fit = sharp.fit.cover;
    } else {
      optionsImage.withoutEnlargement = true;
      optionsImage.fit = sharp.fit.inside;
    }
    const base = sharp(options.input).resize(optionsImage.width, optionsImage.height, optionsImage);
    let final = base;
    if (options.crop) {
      final = base.extract({left: 0, top: 0, width: optionsImage.width, height: optionsImage.height});
    }
    const resultOptions: any = {
      quality: options.quality || 90,
    };
    const finalFormat = options.format || null;
    switch (finalFormat) {
      case "jpeg":
        final = final.jpeg(resultOptions);
        break;
      case "png":
        final = final.png(resultOptions);
        break;
    }
    return final.toBuffer();
  };

  /**
   * Resize Images
   * @param {InterfaceImageResize} options
   */
  public resize = async (options: InterfaceImageResize) => {
    if (!options.fileName) {
      throw new Error("Google Cloud Storage path not found or invalid");
    }
    const fileRef = admin.storage().bucket(this.firebaseConfig.storageBucket).file(options.fileName);
    const [fileObject] = await fileRef.download();
    return this.bufferImage({...options, input: fileObject});
  };

  /**
   * Get default image size
   * @param {string} inputSize
   * @return {any}
   */
  public size: (inputSize: (imageSizesType)) => { height: number; size: string; width: number; } = (inputSize) => {
    const sizeBase = inputSize && this.sizesOptionsArray.indexOf(inputSize) >= 0 ? inputSize : "standard";
    return {
      height: this.sizesObject[sizeBase].height,
      width: this.sizesObject[sizeBase].width,
      size: sizeBase,
    };
  };
}


