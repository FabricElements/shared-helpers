/**
 * Validates and normalises a phone number to E.164 format.
 *
 * Strips all non-digit, non-plus characters, parses the result using
 * `libphonenumber-js` with a US default region, and verifies that the
 * number is valid and of a mobile-compatible type (`MOBILE`,
 * `FIXED_LINE_OR_MOBILE`, or `undefined`).
 *
 * @param {string|number} phoneNumber - The raw phone number string or numeric value to validate.
 * @returns {string|null} The E.164-formatted phone number string (e.g., `'+15551234567'`),
 *   or `null` if the input cannot be parsed or is not a valid mobile number.
 */
declare const _default: (phoneNumber: string | number) => string | null;
export default _default;
