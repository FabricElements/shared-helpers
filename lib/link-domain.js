/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
export const domains = [
    'link.entango.app',
];
/**
 * Return Domain and Url.
 *
 * @param {object} options
 * @return {string}
 */
export const randomDomain = (options) => {
    const data = typeof options === 'object' ? options : {};
    const domainsArray = !!data.domains &&
        Array.isArray(data.domains) &&
        data.domains.length > 0 ? data.domains : domains;
    const random = Math.floor((Math.random() * domainsArray.length));
    const domain = domainsArray[random];
    if (!data.id) {
        return domain;
    }
    return `${domain}/${data.id}`;
};
//# sourceMappingURL=link-domain.js.map