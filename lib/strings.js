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
exports.toCamelCase = (str) => {
    return str.replace(/_([a-z])/g, (g) => {
        return g[1].toUpperCase();
    });
};
//# sourceMappingURL=strings.js.map