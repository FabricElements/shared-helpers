import type { imageSizesType, InterfaceImageResize } from "./interfaces";
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
    constructor(config?: {
        firebaseConfig?: any;
        isBeta?: boolean;
    });
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
