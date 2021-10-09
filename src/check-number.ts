/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import {formatNumber, getNumberType, isValidNumber, parseNumber} from "libphonenumber-js";

/**
 * Check if number is valid and format
 *
 * @param {string} phoneNumber
 * @param {boolean} isMobile
 * @returns {string}
 */
export default async (phoneNumber: string | number, isMobile: boolean = false) => {
  try {
    let originalNumber = phoneNumber.toString();
    originalNumber = originalNumber.replace(/[^+0-9]/g, "");
    const hasFormat = originalNumber.match(/^\+[1-9]{1,3}\d{5,14}$/g);
    if (!hasFormat) {
      throw new Error("Number is not in E.164 format");
    }
    const baseNumber: any = parseNumber(originalNumber);
    const numberParsed: boolean = Object.keys(baseNumber).length > 0;
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
  } catch (error) {
    throw new Error(error.message);
  }
};
