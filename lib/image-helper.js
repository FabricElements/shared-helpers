"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImageHelper = void 0;
const tslib_1 = require("tslib");
/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
const storage_1 = require("firebase-admin/storage");
const sharp_1 = tslib_1.__importDefault(require("sharp"));
/**
 * ImageHelper
 * @param {any} options
 */
class ImageHelper {
    /**
     * @param {any} config
     */
    constructor(config) {
        this.sizesObject = {
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
        this.sizesOptionsArray = Object.keys(this.sizesObject);
        /**
         * bufferImage
         * @param {InterfaceImageResize} options
         */
        this.bufferImage = async (options) => {
            const optionsImage = {
            // withoutEnlargement: true,
            };
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
                optionsImage.position = options.crop === 'attention' ? sharp_1.default.strategy.attention : sharp_1.default.strategy.entropy;
                optionsImage.fit = sharp_1.default.fit.cover;
            }
            else {
                optionsImage.withoutEnlargement = true;
                optionsImage.fit = sharp_1.default.fit.inside;
            }
            const base = (0, sharp_1.default)(options.input, {
                animated: true,
            }).resize(optionsImage.width, optionsImage.height, optionsImage);
            let final = base;
            if (crop) {
                final = base.extract({ left: 0, top: 0, width: optionsImage.width, height: optionsImage.height });
            }
            const resultOptions = {
                quality: options.quality || 90,
            };
            let finalFormat = options.contentType.split('/').pop();
            if (options.input.format != null)
                finalFormat = options.input.format;
            switch (finalFormat) {
                case 'jpeg':
                    final = final.jpeg(resultOptions);
                    break;
                case 'png':
                    final = final.png(resultOptions);
                    break;
                case 'gif':
                    final = final.gif(resultOptions);
                    break;
            }
            return final.toBuffer();
        };
        /**
         * Resize Images
         * @param {InterfaceImageResize} options
         */
        this.resize = async (options) => {
            if (!options.fileName) {
                throw new Error('Google Cloud Storage path not found or invalid');
            }
            const fileRef = (0, storage_1.getStorage)().bucket(this.firebaseConfig.storageBucket).file(options.fileName);
            const [fileObject] = await fileRef.download();
            return this.bufferImage({ ...options, input: fileObject });
        };
        /**
         * Get default image size
         * @param {string} inputSize
         * @return {any}
         */
        this.size = (inputSize) => {
            const sizeBase = inputSize && this.sizesOptionsArray.indexOf(inputSize) >= 0 ? inputSize : 'standard';
            return {
                height: this.sizesObject[sizeBase].height,
                width: this.sizesObject[sizeBase].width,
                size: sizeBase,
            };
        };
        if (config && Object.keys(config).length > 0) {
            this.firebaseConfig = config.firebaseConfig;
            this.isBeta = !!config.isBeta;
        }
    }
}
exports.ImageHelper = ImageHelper;
//# sourceMappingURL=image-helper.js.map