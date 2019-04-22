"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
const libphonenumber_js_1 = require("libphonenumber-js");
/**
 * Check if number is valid and format
 *
 * @param {string} number
 * @param {boolean} isMobile
 * @returns {string}
 */
exports.default = async (number, isMobile = false) => {
    try {
        let originalNumber = number.toString();
        originalNumber = originalNumber.replace(/[^+0-9]/g, "");
        const hasFormat = originalNumber.match(/^\+[1-9]{1,3}\d{5,14}$/g);
        if (!hasFormat) {
            throw new Error("Number is not in E.164 format");
        }
        const baseNumber = libphonenumber_js_1.parseNumber(originalNumber);
        const isValid = libphonenumber_js_1.isValidNumber(baseNumber);
        if (!isValid) {
            throw new Error("Invalid number");
        }
        const numberType = libphonenumber_js_1.getNumberType(baseNumber);
        if (isMobile) {
            const isMobileOrOk = numberType === "MOBILE" || numberType === "FIXED_LINE_OR_MOBILE" || numberType === undefined;
            if (!isMobileOrOk) {
                throw new Error("Is not a mobile number");
            }
        }
        const finalNumber = libphonenumber_js_1.formatNumber(baseNumber, "E.164");
        if (finalNumber.length < 7) {
            throw new Error("Number is too short");
        }
        return finalNumber;
    }
    catch (error) {
        throw new Error(error.message);
    }
};
//# sourceMappingURL=checkNumber.js.map