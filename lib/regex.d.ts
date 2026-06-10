/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
/**
 * Regular expression that matches a valid RFC 5322-compliant email address.
 * Covers standard local-part and domain formats, including quoted strings and
 * IP-literal domain notation.
 */
export declare const isEmail: RegExp;
/**
 * Regular expression that tests whether a MIME content-type string represents
 * an image format that the `sharp` library can process.
 * The accepted format list is derived dynamically from `Media.AvailableOutputFormats`.
 */
export declare const contentTypeIsImageForSharp: RegExp;
/**
 * Regular expression that tests whether a MIME content-type string represents
 * a JPEG image (either `image/jpeg` or `image/jpg`).
 */
export declare const contentTypeIsJPEG: RegExp;
/**
 * Regular expression that tests whether a MIME content-type string represents
 * any recognised raster or vector image format (broader than the sharp subset).
 */
export declare const isImage: RegExp;
/**
 * Regular expression that tests whether a MIME content-type string represents
 * a supported media type, including PDFs, images, audio, video, and common
 * plain-text subtypes (plain, vCard, CSV, RTF, richtext, calendar, directory).
 */
export declare const isMedia: RegExp;
