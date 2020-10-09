"use strict";
/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const hash_id_1 = require("./hash-id");
const link_domain_1 = require("./link-domain");
const special_char_to_regular_1 = require("./special-char-to-regular");
const strings_1 = require("./strings");
/**
 * Random Reply Stop by language
 * @param language
 */
const replyStop = (language) => {
    const messages = {
        // Max length: 26 characters
        "en": [
            "Reply STOP to end",
            "Reply STOP to remove",
            "Reply STOP to unsubscribe",
            "Reply OPT OUT to end",
            "Reply OPT OUT to remove",
            "Reply QUIT to end",
            "Reply QUIT to remove",
            "Reply QUIT to unsubscribe",
            "Reply UNSUBSCRIBE to end",
            "Send QUIT to end",
            "Send QUIT to remove",
            "Send QUIT to unsubscribe",
            "Send STOP to end",
            "Send STOP to remove",
            "Send STOP to unsubscribe",
            "Send UNSUBSCRIBE to end",
            "Send OPT OUT to end",
            "Send OPT OUT to remove",
        ],
        "es": [
            "Responde STOP para anular",
            "Contesta STOP para anular",
            "Envia STOP para anular",
            "Envia STOP para cancelar",
            "Envia STOP para detener",
            "Envia ELIMINAR para anular",
            "Envia CANCELAR para anular",
            "Envia PARAR para anular",
            "Envia PARAR para detener",
            "Envia ELIMINAR para anular",
        ]
    };
    const messagesByLanguage = messages.hasOwnProperty(language) ? messages[language] : messages.en;
    const random = Math.floor((Math.random() * messagesByLanguage.length));
    return messagesByLanguage[random];
};
/**
 * Replace message text with custom keys
 *
 * @param {any} options
 * @returns {string}
 */
exports.default = (options) => {
    var _a;
    let final = !!options.text ? options.text.replace(/ +(?= )/g, "") : "";
    const matches = final.match(/{(?:.*?)}/g);
    const length = matches ? matches.length : 0;
    const language = (_a = options.language) !== null && _a !== void 0 ? _a : "en";
    for (let i = 0; i < length; i++) {
        const match = matches[i];
        const clean = match.toLowerCase().replace(/[{}]/gi, "");
        const key = strings_1.toCamelCase(clean);
        let replaceValue = options.data[key] ? options.data[key] : "";
        switch (key) {
            case "r": // Replaces random hash Id
                replaceValue = hash_id_1.default();
                break;
            case "link": // Replaces link references with a random domain
                replaceValue = link_domain_1.randomDomain({ domains: options.domains });
                break;
            case "replyStopUnsubscribe": // Replaces random unsubscribe message
                replaceValue = replyStop(language);
                break;
            default:
                replaceValue = special_char_to_regular_1.default(replaceValue);
                break;
        }
        final = final.replace(matches[i], replaceValue);
    }
    return final.replace(/[{}]/gmi, "");
};
//# sourceMappingURL=replace-message-text.js.map