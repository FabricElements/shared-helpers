/**
 * Replaces `{placeholder}` tokens in a template string with values from a data map.
 *
 * Scans the template for `{key}` tokens, converts each key to camelCase, then
 * substitutes the corresponding value from `options.data`.  Two special tokens
 * are handled regardless of the data map: `{r}` is replaced with a random hash
 * ID and `{replyStopUnsubscribe}` is replaced with a locale-appropriate opt-out
 * instruction.  Any value substituted through the default path is run through
 * `specialCharToRegular` to normalise non-GSM characters.  Excess whitespace
 * is collapsed and any leftover `{}` characters are removed from the result.
 *
 * @param {object} options - Template-rendering options.
 * @param {object} [options.data] - Key-value map of substitution values indexed by camelCase key.
 * @param {string[]} [options.domains] - Reserved for future use (domain allow-list).
 * @param {string} [options.language] - BCP 47 language code used to select the unsubscribe
 *   message locale.  Defaults to `'en'`.
 * @param {string} options.text - The template string containing `{placeholder}` tokens.
 * @returns {string} The rendered string with all tokens replaced and excess whitespace removed.
 */
declare const _default: (options: {
    data?: object;
    domains?: string[];
    language?: string;
    text: string;
}) => string;
export default _default;
