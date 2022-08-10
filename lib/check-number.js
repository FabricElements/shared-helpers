"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
// import {formatNumber, getNumberType, isValidNumber, parseNumber} from 'libphonenumber-js';
const inclusion_1 = tslib_1.__importDefault(require("inclusion"));
/**
 * Check if number is valid and format
 *
 * @param {string} phoneNumber
 * @param {boolean} isMobile
 * @return {string}
 */
exports.default = async (phoneNumber, isMobile = false) => {
    try {
        const { formatNumber, getNumberType, isValidNumber, parseNumber } = await (0, inclusion_1.default)('libphonenumber-js');
        let originalNumber = phoneNumber.toString();
        originalNumber = originalNumber.replace(/[^+0-9]/g, '');
        const hasFormat = originalNumber.match(/^\+[1-9]{1,3}\d{5,14}$/g);
        if (!hasFormat) {
            throw new Error('Number is not in E.164 format');
        }
        const baseNumber = parseNumber(originalNumber);
        const numberParsed = Object.keys(baseNumber).length > 0;
        const isValid = numberParsed ? isValidNumber(baseNumber) : false;
        if (!isValid) {
            throw new Error('Invalid number');
        }
        const numberType = getNumberType(baseNumber);
        if (isMobile) {
            const isMobileOrOk = numberType === 'MOBILE' || numberType === 'FIXED_LINE_OR_MOBILE' || numberType === undefined;
            if (!isMobileOrOk) {
                throw new Error('Is not a mobile number');
            }
        }
        const finalNumber = formatNumber(baseNumber, 'E.164');
        if (finalNumber.length < 7) {
            throw new Error('Number is too short');
        }
        return finalNumber;
    }
    catch (error) {
        // @ts-ignore
        throw new Error(error.message);
    }
};
//# sourceMappingURL=check-number.js.map