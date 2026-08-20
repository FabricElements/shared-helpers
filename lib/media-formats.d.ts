/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 *
 * @fileoverview Leaf module holding the media output format enum.
 *
 * This module intentionally imports nothing from `./media.js` or `./regex.js`.
 * Both of those modules depend on `AvailableOutputFormats`, and keeping the enum
 * here breaks the `media` <-> `regex` import cycle that previously made a direct
 * `@fabricelements/shared-helpers/media` import fail at load time.
 */
/**
 * Available Image Output Formats
 *
 * Members mirror the container formats libvips can read.  Only a subset is
 * usable as an output format by `sharp.toFormat` (`avif`, `dz`, `gif`, `jpeg`,
 * `jp2`, `jxl`, `png`, `raw`, `tiff`, `webp`); the remaining members are kept
 * for backwards compatibility and for content-type detection, and sharp will
 * reject them if requested as an output format.
 *
 * The declaration order of the members is significant: it determines the
 * alternation order of the `contentTypeIsImageForSharp` regular expression in
 * `./regex.js`.
 * @enum {string}
 */
export declare enum AvailableOutputFormats {
    avif = "avif",
    dz = "dz",
    fits = "fits",
    gif = "gif",
    heif = "heif",
    input = "input",
    jpeg = "jpeg",
    jp2 = "jp2",
    jxl = "jxl",
    magick = "magick",
    openslide = "openslide",
    pdf = "pdf",
    png = "png",
    ppm = "ppm",
    raw = "raw",
    svg = "svg",
    tiff = "tiff",
    v = "v",
    webp = "webp"
}
