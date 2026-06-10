import { Media } from './media.js';
/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
// eslint-disable-next-line max-len,no-control-regex
/**
 * Regular expression that matches a valid RFC 5322-compliant email address.
 * Covers standard local-part and domain formats, including quoted strings and
 * IP-literal domain notation.
 */
export const isEmail = new RegExp('(?:[a-z0-9!#$%&\'*+/=?^_`{|}~-]+(?:\\.[a-z0-9!#$%&\'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\\[(?:(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9]))\\.){3}(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9])|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)])');
// export const contentTypeIsImageForSharp = new RegExp('^(image\\/)(jpeg|jpg|png|tiff|webp|gif|svg)'); // Sharp can handle this formats
/**
 * Regular expression that tests whether a MIME content-type string represents
 * an image format that the `sharp` library can process.
 * The accepted format list is derived dynamically from `Media.AvailableOutputFormats`.
 */
export const contentTypeIsImageForSharp = new RegExp(`^(image\\/)(${Object.keys(Media.AvailableOutputFormats).join('|')})`); // Checks if will be image
/**
 * Regular expression that tests whether a MIME content-type string represents
 * a JPEG image (either `image/jpeg` or `image/jpg`).
 */
export const contentTypeIsJPEG = new RegExp('^(image\\/)(jpeg|jpg)'); // Checks if will be jpeg
// eslint-disable-next-line max-len
/**
 * Regular expression that tests whether a MIME content-type string represents
 * any recognised raster or vector image format (broader than the sharp subset).
 */
export const isImage = new RegExp('^(image\\/)(bmp|cis-cod|gif|ief|jpeg|jpg|pipeg|svg+xml|tiff|x-cmu-raster|x-cmx|x-icon|x-portable-anymap|x-portable-bitmap|x-portable-graymap|x-portable-pixmap|x-rgb|x-xbitmap|x-xpixmap|x-xwindowdump)'); // is image file
/**
 * Regular expression that tests whether a MIME content-type string represents
 * a supported media type, including PDFs, images, audio, video, and common
 * plain-text subtypes (plain, vCard, CSV, RTF, richtext, calendar, directory).
 */
export const isMedia = new RegExp('^(application\\/pdf|image|audio|video|text\\/(plain|vcard|csv|rtf|richtext|calendar|directory))');
//# sourceMappingURL=regex.js.map