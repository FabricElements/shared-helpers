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
Object.defineProperty(exports, "__esModule", { value: true });
exports.MediaHelper = void 0;
const admin = __importStar(require("firebase-admin"));
const image_helper_1 = require("./image-helper");
const regex_js_1 = require("./regex.js");
if (!admin.apps.length) {
    admin.initializeApp();
}
class MediaHelper {
    constructor(config) {
        /**
         * Preview media file
         * @param {any} options
         */
        this.preview = (options) => __awaiter(this, void 0, void 0, function* () {
            let { crop, height, path, dpr, response, robots, size, width, } = options;
            const _cacheTime = this.isBeta ? 60 : 86400; // 1 day in seconds
            let mediaBuffer = null;
            let contentType = "text/html";
            response.set("Content-Type", contentType);
            // Don't use "/" at the start or end of your path
            if (path.startsWith("/")) {
                path = path.substring(1);
            }
            const imageHelper = new image_helper_1.ImageHelper({
                firebaseConfig: this.firebaseConfig,
                isBeta: this.isBeta,
            });
            // const publicUrl = global.getUrlAndGs(mediaPath).url;
            const fileRef = admin.storage().bucket(this.firebaseConfig.storageBucket).file(path);
            let ok = true;
            const imageResizeOptions = {};
            /**
             * Define image size
             */
            const imageSize = imageHelper.size(size);
            imageResizeOptions.maxHeight = height ? Math.floor(height) : imageSize.height;
            imageResizeOptions.maxWidth = width ? Math.floor(width) : imageSize.width;
            if (crop || imageSize.size === "thumbnail") {
                imageResizeOptions.crop = crop !== null && crop !== void 0 ? crop : "entropy";
            }
            if (dpr) {
                imageResizeOptions.dpr = dpr;
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
            let indexRobots = !!robots;
            try {
                const [metadata] = yield fileRef.getMetadata();
                contentType = metadata.contentType || null;
                const fileSize = metadata.size || 0;
                if (!contentType) {
                    throw new Error("contentType is missing");
                }
                if (fileSize === 0) {
                    throw new Error("Media file is empty");
                }
                if (regex_js_1.contentTypeIsImageForSharp.test(contentType) && fileSize !== "max") {
                    /**
                     * Handle images
                     */
                    const isJPEG = regex_js_1.contentTypeIsJPEG.test(contentType);
                    const format = isJPEG ? "jpeg" : "png";
                    mediaBuffer = yield imageHelper.resize(Object.assign(Object.assign({}, imageResizeOptions), { fileName: path, format }));
                    contentType = `image/${format}`;
                    indexRobots = true;
                }
                else {
                    /**
                     * Handle all media file types
                     */
                    [mediaBuffer] = yield fileRef.download();
                }
            }
            catch (error) {
                ok = false;
                if (this.isBeta) {
                    console.warn(`${path}:`, error.message);
                }
            }
            if (!indexRobots) {
                response.set("X-Robots-Tag", "none"); // Prevent robots from indexing
            }
            if (!ok) {
                /**
                 * End request for messages to prevent the provider sending messages with invalid media files
                 */
                if (size === "message") {
                    console.warn("Can't find media file");
                    response.set("Cache-Control", "no-cache, no-store, s-maxage=10, max-age=10, min-fresh=5, must-revalidate");
                    response.status(404);
                    response.end();
                    return;
                }
                mediaBuffer = yield imageHelper.resize(Object.assign({ fileName: "media/default/error.jpg" }, imageResizeOptions));
                contentType = "image/jpeg";
            }
            if (!mediaBuffer) {
                mediaBuffer = yield imageHelper.resize(Object.assign({ fileName: "media/default/default.jpg" }, imageResizeOptions));
                contentType = "image/jpeg";
                response.set("Cache-Control", "no-cache, no-store, s-maxage=10, max-age=10, min-fresh=5, must-revalidate");
            }
            else {
                response.status(200);
                response.set("Cache-Control", `immutable, public, max-age=${_cacheTime}, s-maxage=${_cacheTime * 2}, min-fresh=${_cacheTime}`); // only cache if method changes to get
            }
            response.set("Content-Type", contentType);
            response.send(mediaBuffer);
            return null;
        });
        /**
         * Preview media file
         * @param {any} options
         */
        this.save = (options) => __awaiter(this, void 0, void 0, function* () {
            const bucketRef = admin.storage().bucket(this.firebaseConfig.storageBucket);
            const fileRef = bucketRef.file(options.path);
            const fileOptions = Object.assign({ contentType: options.contentType, resumable: false, validation: true }, options.options);
            // await fileRef.createWriteStream(fileOptions);
            yield fileRef.save(options.media, fileOptions);
        });
        if (config && Object.keys(config).length > 0) {
            this.firebaseConfig = config.firebaseConfig;
            this.isBeta = !!config.isBeta;
        }
    }
}
exports.MediaHelper = MediaHelper;
//# sourceMappingURL=media-helper.js.map