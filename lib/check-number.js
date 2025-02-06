// noinspection ExceptionCaughtLocallyJS
/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import { parsePhoneNumberWithError } from 'libphonenumber-js';
/**
 * Check if number is valid and format
 * @param {string|number} phoneNumber
 * @return {string|null}
 */
export default (phoneNumber) => {
    try {
        let originalNumber = phoneNumber.toString();
        originalNumber = originalNumber.replace(/[^+0-9]/g, '');
        if (!originalNumber.match(/^[+0-9]*$/g)) {
            throw new Error('Invalid number');
        }
        const baseNumber = parsePhoneNumberWithError(originalNumber, 'US');
        const isValid = baseNumber.isValid();
        const numberType = baseNumber.getType();
        const isMobileOrOk = numberType === 'MOBILE' ||
            numberType === 'FIXED_LINE_OR_MOBILE' ||
            numberType === undefined;
        if (!isValid && !isMobileOrOk) {
            throw new Error('Invalid number or not mobile');
        }
        return baseNumber.format('E.164');
    }
    catch (error) {
        return null;
    }
};
//# sourceMappingURL=check-number.js.map