var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import { formatNumber, getNumberType, isValidNumber, parseNumber } from "libphonenumber-js";
/**
 * Check if number is valid and format
 *
 * @param {string} phoneNumber
 * @param {boolean} isMobile
 * @returns {string}
 */
export default (phoneNumber, isMobile = false) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let originalNumber = phoneNumber.toString();
        originalNumber = originalNumber.replace(/[^+0-9]/g, "");
        const hasFormat = originalNumber.match(/^\+[1-9]{1,3}\d{5,14}$/g);
        if (!hasFormat) {
            throw new Error("Number is not in E.164 format");
        }
        const baseNumber = parseNumber(originalNumber);
        const numberParsed = Object.keys(baseNumber).length > 0;
        const isValid = numberParsed ? isValidNumber(baseNumber) : false;
        if (!isValid) {
            throw new Error("Invalid number");
        }
        const numberType = getNumberType(baseNumber);
        if (isMobile) {
            const isMobileOrOk = numberType === "MOBILE" || numberType === "FIXED_LINE_OR_MOBILE" || numberType === undefined;
            if (!isMobileOrOk) {
                throw new Error("Is not a mobile number");
            }
        }
        const finalNumber = formatNumber(baseNumber, "E.164");
        if (finalNumber.length < 7) {
            throw new Error("Number is too short");
        }
        return finalNumber;
    }
    catch (error) {
        throw new Error(error.message);
    }
});
//# sourceMappingURL=check-number.js.map