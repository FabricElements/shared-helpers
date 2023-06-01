/// <reference types="node" resolution-mode="require"/>
import type { FieldValue } from 'firebase-admin/firestore';
/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
export interface InterfaceUserAds {
    adsense?: {
        client: string;
        slot: string;
    };
}
export interface InterfaceUserLinks {
    behance?: string;
    dribbble?: string;
    facebook?: string;
    instagram?: string;
    linkedin?: string;
    tiktok?: string;
    twitter?: string;
    website?: string;
    youtube?: string;
}
export interface InterfaceUser {
    backup?: boolean;
    ads?: InterfaceUserAds;
    avatar?: boolean | string | any;
    created?: Date | FieldValue | String;
    id?: string;
    language?: string;
    links?: InterfaceUserLinks;
    name?: string;
    firstName?: string;
    abbr?: string;
    lastName?: string;
    path?: string;
    referrer?: string;
    updated?: Date | FieldValue | String;
    url?: string;
    username?: string;
    phone?: string;
    email?: string;
    role?: string;
    group?: string;
    groups?: {
        [key: string]: string | number;
    };
    ping?: any;
    fcm?: string;
    bcId?: string;
    bsId?: string;
    bsiId?: string;
    [key: string]: any;
}
export type linkType = 'instagram' | 'link' | 'youtube' | 'twitter' | 'tiktok' | 'vimeo' | string;
export interface InterfaceFormatLink {
    active?: boolean;
    category?: string;
    created?: Date | FieldValue | String;
    description?: string;
    featured?: boolean;
    hashtags?: string;
    id?: string;
    image?: string;
    keywords?: string[];
    language?: string;
    link?: string;
    media?: string;
    path?: string;
    safe?: boolean;
    source?: string;
    title?: string;
    type?: linkType;
    updated?: Date | FieldValue | String;
    url?: string;
    user?: string;
}
export interface InterfaceImageResize {
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
export type imageSizesType = null | string | 'thumbnail' | 'small' | 'medium' | 'standard' | 'high' | 'max';
export type fetchResponse = null | 'json' | 'text' | 'raw' | 'arrayBuffer' | 'formData' | 'blob';
export interface InterfaceAPIRequest {
    body?: any;
    credentials?: string;
    headers?: any;
    method?: 'GET' | 'HEAD' | 'POST' | 'PUT' | 'DELETE' | 'CONNECT' | 'OPTIONS' | 'TRACE' | 'PATCH';
    path?: string;
    raw?: boolean;
    scheme?: 'Basic' | 'Bearer' | 'Digest' | 'OAuth';
    as?: fetchResponse;
}
