/// <reference types="node" />
/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import type express from "express";
import { imageSizesType } from "./interfaces";
export declare class MediaHelper {
    firebaseConfig: any;
    isBeta: boolean;
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
        request: express.Request;
        response: express.Response;
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
