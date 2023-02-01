/// <reference types="node" resolution-mode="require"/>
/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import type { Response } from 'express';
import type { imageSizesType } from './interfaces.js';
/**
 * MediaHelper
 */
export declare class MediaHelper {
    firebaseConfig: any;
    isBeta: boolean;
    /**
     * @param {any} config
     */
    constructor(config?: {
        firebaseConfig?: any;
        isBeta?: boolean;
    });
    /**
     * Preview media file
     * @param {any} options
     */
    preview: (options: {
        [key: string]: any;
        crop?: string;
        dpr?: number;
        height?: number;
        path: string;
        response: Response;
        robots?: boolean;
        size?: imageSizesType;
        width?: number;
    }) => Promise<any>;
    /**
     * Preview media file
     * @param {any} options
     */
    save: (options: {
        contentType: string;
        media: Buffer;
        options?: object;
        path?: string;
    }) => Promise<void>;
}
