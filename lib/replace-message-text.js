/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import hashId from './hash-id.js';
import specialCharToRegular from './special-char-to-regular.js';
import { toCamelCase } from './strings.js';
/**
 * Selects a random locale-appropriate opt-out instruction string.
 *
 * Returns one of several pre-defined unsubscribe prompts for the given
 * language (English or Spanish), each capped at 26 characters to comply
 * with carrier limits.  Falls back to English when the language is not
 * recognised.
 *
 * @param {string} language - BCP 47 language code (e.g., `'en'`, `'es'`).
 * @returns {string} A randomly chosen unsubscribe instruction string for the language.
 */
const replyStop = (language) => {
    const messages = {
        // Max length: 26 characters
        'en': [
            'Reply STOP to end',
            'Reply STOP to remove',
            'Reply STOP to unsubscribe',
            'Reply OPT OUT to end',
            'Reply OPT OUT to remove',
            'Reply QUIT to end',
            'Reply QUIT to remove',
            'Reply QUIT to unsubscribe',
            'Reply UNSUBSCRIBE to end',
            'Send QUIT to end',
            'Send QUIT to remove',
            'Send QUIT to unsubscribe',
            'Send STOP to end',
            'Send STOP to remove',
            'Send STOP to unsubscribe',
            'Send UNSUBSCRIBE to end',
            'Send OPT OUT to end',
            'Send OPT OUT to remove',
        ],
        'es': [
            'Responde STOP para anular',
            'Contesta STOP para anular',
            'Envia STOP para anular',
            'Envia STOP para cancelar',
            'Envia STOP para detener',
            'Envia ELIMINAR para anular',
            'Envia CANCELAR para anular',
            'Envia PARAR para anular',
            'Envia PARAR para detener',
            'Envia ELIMINAR para anular',
        ],
    };
    const messagesByLanguage = Object.prototype.hasOwnProperty.call(messages, language) ? messages[language] : messages.en;
    const random = Math.floor((Math.random() * messagesByLanguage.length));
    return messagesByLanguage[random];
};
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
export default (options) => {
    let final = options.text ? options.text.replace(/ +(?= )/g, '') : '';
    const matches = final.match(/{.*?}/g);
    const length = matches ? matches.length : 0;
    const language = options.language ?? 'en';
    for (let i = 0; i < length; i++) {
        const match = matches[i];
        const clean = match.toLowerCase().replace(/[{}]/gi, '');
        const key = toCamelCase(clean);
        let replaceValue = options.data[key] ? options.data[key] : '';
        switch (key) {
            case 'r': // Replaces random hash id
                replaceValue = hashId();
                break;
            case 'replyStopUnsubscribe': // Replaces random unsubscribe message
                replaceValue = replyStop(language);
                break;
            default:
                replaceValue = specialCharToRegular(replaceValue);
                break;
        }
        final = final.replace(matches[i], replaceValue);
    }
    return final.replace(/[{}]/gmi, '');
};
//# sourceMappingURL=replace-message-text.js.map