"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Cache = void 0;
const util_1 = require("util");
/**
 * Cache
 */
class Cache {
    constructor(firebaseConfig, client) {
        var _a, _b, _c;
        this.config = firebaseConfig;
        this.client = client;
        this.prefix = (_c = (_b = (_a = this.config) === null || _a === void 0 ? void 0 : _a.redis) === null || _b === void 0 ? void 0 : _b.prefix) !== null && _c !== void 0 ? _c : "";
    }
    async(action) {
        return util_1.promisify(action).bind(this.client);
    }
}
exports.Cache = Cache;
//# sourceMappingURL=cache.js.map