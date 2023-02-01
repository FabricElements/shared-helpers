/// <reference types="node" resolution-mode="require"/>
import type { imageSizesType, InterfaceImageResize } from './interfaces.js';
/**
 * ImageHelper
 * @param {any} options
 */
export declare class ImageHelper {
    firebaseConfig: any;
    isBeta: boolean;
    sizesObject: {
        [field: string]: {
            height: number;
            width: number;
        };
    };
    sizesOptionsArray: string[];
    /**
     * @param {any} config
     */
    constructor(config?: {
        firebaseConfig?: any;
        isBeta?: boolean;
    });
    /**
     * bufferImage
     * @param {InterfaceImageResize} options
     */
    bufferImage: (options: InterfaceImageResize) => Promise<Buffer>;
    /**
     * Resize Images
     * @param {InterfaceImageResize} options
     */
    resize: (options: InterfaceImageResize) => Promise<Buffer>;
    /**
     * Get default image size
     * @param {string} inputSize
     * @return {any}
     */
    size: (inputSize: (imageSizesType)) => {
        height: number;
        size: string;
        width: number;
    };
}
