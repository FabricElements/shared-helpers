/// <reference types="node" resolution-mode="require"/>
/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import { Buffer } from 'buffer';
import type { Response } from 'express';
export declare namespace Media {
    /**
     * Save From URL Interface
     */
    export interface SaveFromUrl {
        contentType: string;
        uri: string;
    }
    export interface InterfaceImageResize {
        crop?: string;
        dpr?: number;
        fileName?: string;
        format?: AvailableOutputFormats;
        input?: Buffer | Uint8Array | string | any;
        maxHeight?: number;
        maxWidth?: number;
        quality?: number;
        contentType?: string;
    }
    /**
     * Set of predefined image sizes
     */
    export enum ImageSize {
        thumbnail = "thumbnail",
        small = "small",
        medium = "medium",
        standard = "standard",
        high = "high",
        max = "max"
    }
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
        size?: Media.ImageSize;
        width?: number;
        showImageOnError?: boolean;
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
        static saveFromUrl(options: {
            url: string;
            path: string;
        }): Promise<Media.SaveFromUrl>;
        /**
         * Preview media file
         * @param {PreviewParams} options
         */
        static preview: (options: PreviewParams) => Promise<void>;
        /**
         * Save media file
         * @param {any} options
         */
        static save: (options: {
            contentType: string;
            media: Buffer;
            options?: object;
            path?: string;
        }) => Promise<void>;
    }
    /**
     * sizesObject
     * @type {object}
     * @return { [field: string]: { height: number; width: number; } }
     */
    export const sizesObject: Record<ImageSize, {
        height: number;
        width: number;
    }>;
    /**
     * sizesOptionsArray
     * @type {string[]} sizesOptionsArray
     */
    export const sizesOptionsArray: string[];
    /**
     * Available Output Formats
     * @enum {string}
     */
    export enum AvailableOutputFormats {
        avif = "avif",
        dz = "dz",
        fits = "fits",
        gif = "gif",
        heif = "heif",
        input = "input",
        jpeg = "jpeg",
        jp2 = "jp2",
        jxl = "jxl",
        magick = "magick",
        openslide = "openslide",
        pdf = "pdf",
        png = "png",
        ppm = "ppm",
        raw = "raw",
        svg = "svg",
        tiff = "tiff",
        v = "v",
        webp = "webp"
    }
    /**
     * Image Helper
     * @param {any} options
     */
    export class Image {
        /**
         * bufferImage
         * @param {InterfaceImageResize} options
         * @return {Promise<{contentType: string; buffer: Buffer}>}
         */
        static bufferImage: (options: InterfaceImageResize) => Promise<{
            contentType: string;
            buffer: Buffer;
        }>;
        /**
         * Resize Images
         * @param {InterfaceImageResize} options
         * @return {Promise<{contentType: string; buffer: Buffer}>}
         */
        static resize: (options: InterfaceImageResize) => Promise<{
            contentType: string;
            buffer: Buffer;
        }>;
        /**
         * Get default image size object when size is not set
         * @param {imageSizesType} inputSize
         * @return {{height: number, width: number, size: ImageSize}}
         */
        static sizeObjectFromImageSize: (inputSize: ImageSize) => {
            height: number;
            width: number;
            size: ImageSize;
        };
    }
    export {};
}
