"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImageHelper = void 0;
/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
const admin = __importStar(require("firebase-admin"));
const sharp_1 = __importDefault(require("sharp"));
class ImageHelper {
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
        this.bufferImage = (options) => __awaiter(this, void 0, void 0, function* () {
            let optionsImage = {};
            if (options.maxHeight || options.crop) {
                optionsImage.height = options.maxHeight || 800;
            }
            if (options.maxWidth || options.crop) {
                optionsImage.width = options.maxWidth || 800;
            }
            if (options.crop) {
                optionsImage.position = sharp_1.default.strategy.entropy;
                optionsImage.fit = sharp_1.default.fit.cover;
            }
            else {
                optionsImage.withoutEnlargement = true;
                optionsImage.fit = sharp_1.default.fit.inside;
            }
            const base = sharp_1.default(options.input).resize(optionsImage.width, optionsImage.height, optionsImage);
            let final = base;
            if (options.crop) {
                final = base.extract({ left: 0, top: 0, width: optionsImage.width, height: optionsImage.height });
            }
            const resultOptions = {
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
        });
        /**
         * Resize Images
         * @param {InterfaceImageResize} options
         */
        this.resize = (options) => __awaiter(this, void 0, void 0, function* () {
            if (!options.fileName) {
                throw new Error("Google Cloud Storage path not found or invalid");
            }
            const fileRef = admin.storage().bucket(this.firebaseConfig.storageBucket).file(options.fileName);
            const [fileObject] = yield fileRef.download();
            return this.bufferImage(Object.assign(Object.assign({}, options), { input: fileObject }));
        });
        /**
         * Get default image size
         * @param {string} inputSize
         * @return {any}
         */
        this.size = (inputSize) => {
            const sizeBase = inputSize && this.sizesOptionsArray.indexOf(inputSize) >= 0 ? inputSize : "standard";
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