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
 * @param {string} phoneNumber
 * @param {boolean} isMobile
 * @returns {string}
 */
exports.default = async (phoneNumber, isMobile = false) => {
    try {
        let originalNumber = phoneNumber.toString();
        originalNumber = originalNumber.replace(/[^+0-9]/g, "");
        const hasFormat = originalNumber.match(/^\+[1-9]{1,3}\d{5,14}$/g);
        if (!hasFormat) {
            throw new Error("Number is not in E.164 format");
        }
        const baseNumber = (0, libphonenumber_js_1.parseNumber)(originalNumber);
        const numberParsed = Object.keys(baseNumber).length > 0;
        const isValid = numberParsed ? (0, libphonenumber_js_1.isValidNumber)(baseNumber) : false;
        if (!isValid) {
            throw new Error("Invalid number");
        }
        const numberType = (0, libphonenumber_js_1.getNumberType)(baseNumber);
        if (isMobile) {
            const isMobileOrOk = numberType === "MOBILE" || numberType === "FIXED_LINE_OR_MOBILE" || numberType === undefined;
            if (!isMobileOrOk) {
                throw new Error("Is not a mobile number");
            }
        }
        const finalNumber = (0, libphonenumber_js_1.formatNumber)(baseNumber, "E.164");
        if (finalNumber.length < 7) {
            throw new Error("Number is too short");
        }
        return finalNumber;
    }
    catch (error) {
        throw new Error(error.message);
    }
};
//# sourceMappingURL=check-number.js.map