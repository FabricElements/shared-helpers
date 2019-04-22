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
 * Replace message text
 *
 * @param {any} data
 * @returns {string}
 */
exports.default = (text, data) => {
    let final = !!text ? text.replace(/ +(?= )/g, "") : "";
    const matches = final.match(/{(?:.*?)}/g);
    const length = matches ? matches.length : 0;
    for (let i = 0; i < length; i++) {
        const match = matches[i];
        const clean = match.toLowerCase().replace(/[{}]/gi, "");
        const key = strings_1.toCamelCase(clean);
        let replaceValue = data[key] ? data[key] : "";
        switch (key) {
            case "r": // Replaces random hash Id
                replaceValue = hash_id_1.default();
                break;
            case "l": // Replaces link references with a random domain
                replaceValue = link_domain_1.randomDomain();
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