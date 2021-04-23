"use strict";
/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.toCamelCase = void 0;
/**
 * To Camel Case conversion
 * @param {string} str
 * @return {string}
 */
const toCamelCase = (str) => {
    return str.replace(/_([a-z])/g, (g) => {
        return g[1].toUpperCase();
    });
};
exports.toCamelCase = toCamelCase;
//# sourceMappingURL=strings.js.map