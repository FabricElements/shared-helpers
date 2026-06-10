// noinspection ExceptionCaughtLocallyJS

/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import {parsePhoneNumberWithError} from 'libphonenumber-js';

/**
 * Validates and normalises a phone number to E.164 format.
 *
 * Strips all non-digit, non-plus characters, parses the result using
 * `libphonenumber-js` with a US default region, and verifies that the
 * number is valid and of a mobile-compatible type (`MOBILE`,
 * `FIXED_LINE_OR_MOBILE`, or `undefined`).
 *
 * @param phoneNumber - The raw phone number string or numeric value to validate.
 * @returns The E.164-formatted phone number string (e.g., `'+15551234567'`),
 *   or `null` if the input cannot be parsed or is not a valid mobile number.
 */
export default (phoneNumber: string | number): string | null => {
  try {
    let originalNumber = phoneNumber.toString();
    originalNumber = originalNumber.replace(/[^+0-9]/g, '');
    if (!originalNumber.match(/^[+0-9]*$/g)) {
      throw new Error('Invalid number');
    }
    const baseNumber = parsePhoneNumberWithError(originalNumber, 'US');
    const isValid = baseNumber.isValid();
    const numberType = baseNumber.getType();
    const isMobileOrOk =
        numberType === 'MOBILE' ||
        numberType === 'FIXED_LINE_OR_MOBILE' ||
        numberType === undefined;
    if (!isValid && !isMobileOrOk) {
      throw new Error('Invalid number or not mobile');
    }
    return baseNumber.format('E.164');
  } catch (error) {
    return null;
  }
};
