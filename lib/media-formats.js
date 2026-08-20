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
export var AvailableOutputFormats;
(function (AvailableOutputFormats) {
    AvailableOutputFormats["avif"] = "avif";
    AvailableOutputFormats["dz"] = "dz";
    AvailableOutputFormats["fits"] = "fits";
    AvailableOutputFormats["gif"] = "gif";
    AvailableOutputFormats["heif"] = "heif";
    AvailableOutputFormats["input"] = "input";
    AvailableOutputFormats["jpeg"] = "jpeg";
    AvailableOutputFormats["jp2"] = "jp2";
    AvailableOutputFormats["jxl"] = "jxl";
    AvailableOutputFormats["magick"] = "magick";
    AvailableOutputFormats["openslide"] = "openslide";
    AvailableOutputFormats["pdf"] = "pdf";
    AvailableOutputFormats["png"] = "png";
    AvailableOutputFormats["ppm"] = "ppm";
    AvailableOutputFormats["raw"] = "raw";
    AvailableOutputFormats["svg"] = "svg";
    AvailableOutputFormats["tiff"] = "tiff";
    AvailableOutputFormats["v"] = "v";
    AvailableOutputFormats["webp"] = "webp";
})(AvailableOutputFormats || (AvailableOutputFormats = {}));
//# sourceMappingURL=media-formats.js.map