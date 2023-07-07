import type { FieldValue } from 'firebase-admin/firestore';
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
