/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
import hashId from './hash-id.js';
import { randomDomain } from './link-domain.js';
import specialCharToRegular from './special-char-to-regular.js';
import { toCamelCase } from './strings.js';
/**
 * Random Reply Stop by language
 *
 * @param {string} language
 * @return {string}
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
 * Replace message text with custom keys
 *
 * @param {any} options
 * @return {string}
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
            case 'r': // Replaces random hash Id
                replaceValue = hashId();
                break;
            case 'link': // Replaces link references with a random domain
                replaceValue = randomDomain({ domains: options.domains });
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