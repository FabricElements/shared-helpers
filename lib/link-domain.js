"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
exports.domains = [
    "link.entango.app",
];
/**
 * Return Domain and Url.
 *
 * @param {object} options
 * @returns {string}
 */
exports.random = (options) => {
    const data = typeof options === "object" ? options : {};
    const domainsArray = !!data.domains
        && Array.isArray(data.domains)
        && data.domains.length > 0 ? data.domains : exports.domains;
    const randomDomain = Math.floor((Math.random() * domainsArray.length));
    const domain = domainsArray[randomDomain];
    if (!data.id) {
        return domain;
    }
    return `${domain}/${data.id}`;
};
//# sourceMappingURL=link-domain.js.map