import type { FieldValue } from 'firebase-admin/firestore';
/**
 * Supported link provider types for formatted link objects.
 * Includes well-known social/media platforms and a generic fallback string.
 */
export type linkType = 'instagram' | 'link' | 'youtube' | 'x' | 'tiktok' | 'vimeo' | string;
/**
 * Represents a formatted link or content card stored in Firestore.
 * Used across modules to describe link preview metadata (OG-style data),
 * including origin source, media attachments, and lifecycle timestamps.
 */
export interface InterfaceFormatLink {
    /** Whether the link is currently active and visible to end users. */
    active?: boolean;
    /** Optional content category label for classification purposes. */
    category?: string;
    /** Timestamp recording when the link document was first created. */
    created?: Date | FieldValue | string;
    /** Human-readable description of the linked content. */
    description?: string;
    /** Whether the link is promoted to a featured position in listings. */
    featured?: boolean;
    /** Comma-separated or space-separated hashtag string associated with the link. */
    hashtags?: string;
    /** Firestore document ID for the link record. */
    id?: string;
    /** Storage path or public URL for the link's preview image. */
    image?: string;
    /** Array of keyword strings used for search and indexing. */
    keywords?: string[];
    /** BCP 47 language code indicating the link content locale (e.g., `'en'`). */
    language?: string;
    /** The raw hyperlink URL as provided by the author. */
    link?: string;
    /** Storage path or public URL for an associated media file. */
    media?: string;
    /** Relative storage path used for internal references. */
    path?: string;
    /** Whether the linked content has been evaluated as safe. */
    safe?: boolean;
    /** Origin or domain identifier where the link was sourced. */
    source?: string;
    /** Display title for the link, typically from OG metadata. */
    title?: string;
    /** Provider type of the link, constrained to `linkType` values. */
    type?: linkType;
    /** Timestamp recording when the link document was last modified. */
    updated?: Date | FieldValue | string;
    /** Canonical public URL for the link. */
    url?: string;
    /** UID of the Firestore user document that owns this link. */
    user?: string;
}
/**
 * Describes the desired response deserialization format for `apiRequest`.
 * `null` triggers automatic content-type-based detection.
 * `'raw'` returns the raw Node.js readable stream body without parsing.
 */
export type fetchResponse = null | 'json' | 'text' | 'raw' | 'arrayBuffer' | 'formData' | 'blob';
/**
 * Configuration options for an outbound HTTP request made via `apiRequest`.
 * Controls the target endpoint, HTTP method, authentication scheme,
 * request body, and the expected response deserialization format.
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods
 */
export interface InterfaceAPIRequest {
    /** The request payload to be JSON-serialised and sent as the body. */
    body?: any;
    /** Credential string (e.g., token or Base64 user:pass) for the Authorization header. */
    credentials?: string;
    /** Additional HTTP headers to merge into the request. */
    headers?: any;
    /** HTTP method for the request. Defaults to the node-fetch default when omitted. */
    method?: 'GET' | 'HEAD' | 'POST' | 'PUT' | 'DELETE' | 'CONNECT' | 'OPTIONS' | 'TRACE' | 'PATCH';
    /** Fully qualified URL of the API endpoint to call. */
    path?: string;
    /** @deprecated Use `as` instead to control response format. */
    raw?: boolean;
    /** HTTP authentication scheme to use when `credentials` is set. */
    scheme?: 'Basic' | 'Bearer' | 'Digest' | 'OAuth';
    /** Desired response body deserialization strategy. */
    as?: fetchResponse;
}
