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
        crop?: boolean;
        id: string;
        isCrawler?: boolean;
        path?: string;
        request: express.Request;
        response: express.Response;
        size?: imageSizesType;
    }) => Promise<any>;
    /**
     * Preview media file
     * @param {any} options
     */
    save: (options: {
        contentType: string;
        id: string;
        media: Buffer;
        options?: object;
        path?: string;
    }) => Promise<void>;
}
