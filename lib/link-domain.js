"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.randomDomain = exports.domains = void 0;
/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
exports.domains = [
    'link.entango.app',
];
/**
 * Return Domain and Url.
 *
 * @param {object} options
 * @return {string}
 */
exports.randomDomain = (options) => {
    const data = typeof options === 'object' ? options : {};
    const domainsArray = !!data.domains &&
        Array.isArray(data.domains) &&
        data.domains.length > 0 ? data.domains : exports.domains;
    const random = Math.floor((Math.random() * domainsArray.length));
    const domain = domainsArray[random];
    if (!data.id) {
        return domain;
    }
    return `${domain}/${data.id}`;
};
//# sourceMappingURL=link-domain.js.map