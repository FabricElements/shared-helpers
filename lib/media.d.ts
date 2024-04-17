/// <reference types="node" resolution-mode="require"/>
/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import type { Response } from 'express';
import { Buffer } from 'buffer';
export declare namespace Media {
    /**
     * Save From URL Interface
     */
    interface SaveFromUrl {
        contentType: string;
        uri: string;
    }
    interface InterfaceImageResize {
        crop?: string;
        dpr?: number;
        fileName?: string;
        format?: 'jpeg' | 'png' | 'gif';
        input?: Buffer | Uint8Array | string | any;
        maxHeight?: number;
        maxWidth?: number;
        quality?: number;
        contentType?: string;
    }
    type imageSizesType = null | string | 'thumbnail' | 'small' | 'medium' | 'standard' | 'high' | 'max';
    /**
     * Media Helper
     */
    class Helper {
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
         * @param {any} options
         */
        static preview: (options: {
            [key: string]: any;
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
        }) => Promise<any>;
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
    const sizesObject: {
        [field: string]: {
            height: number;
            width: number;
        };
    };
    /**
     * sizesOptionsArray
     * @type {string[]} sizesOptionsArray
     */
    const sizesOptionsArray: string[];
    /**
     * Image Helper
     * @param {any} options
     */
    class Image {
        /**
         * bufferImage
         * @param {InterfaceImageResize} options
         * @return {Promise<Buffer>}
         */
        static bufferImage: (options: InterfaceImageResize) => Promise<Buffer>;
        /**
         * Resize Images
         * @param {InterfaceImageResize} options
         * @return {Promise<Buffer>}
         */
        static resize: (options: InterfaceImageResize) => Promise<Buffer>;
        /**
         * Get default image size
         * @param {imageSizesType} inputSize
         * @return {any}
         */
        static size: (inputSize: imageSizesType) => {
            height: number;
            width: number;
            size: string;
        };
    }
}
