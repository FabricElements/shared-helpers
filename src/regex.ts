/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
// eslint-disable-next-line max-len,no-control-regex
export const isEmail = new RegExp('(?:[a-z0-9!#$%&\'*+/=?^_`{|}~-]+(?:\\.[a-z0-9!#$%&\'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\\[(?:(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9]))\\.){3}(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9])|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)])');
export const contentTypeIsImageForSharp = new RegExp('^(image\\/)(jpeg|jpg|png|tiff|webp)'); // Sharp can handle this formats
export const contentTypeIsJPEG = new RegExp('^(image\\/)(jpeg|jpg)'); // Check if will be jpeg
// eslint-disable-next-line max-len
export const isImage = new RegExp('^(image\\/)(bmp|cis-cod|gif|ief|jpeg|jpg|pipeg|svg+xml|tiff|x-cmu-raster|x-cmx|x-icon|x-portable-anymap|x-portable-bitmap|x-portable-graymap|x-portable-pixmap|x-rgb|x-xbitmap|x-xpixmap|x-xwindowdump)'); // is image file
export const isMedia = new RegExp('^(application\\/pdf|image|audio|video|text\\/(plain|vcard|csv|rtf|richtext|calendar|directory))');
