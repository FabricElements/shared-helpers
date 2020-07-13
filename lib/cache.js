"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Cache = void 0;
const util_1 = require("util");
/**
 * Cache
 */
class Cache {
    constructor(firebaseConfig = {}, client) {
        var _a, _b;
        this.get = util_1.promisify(this.client.get).bind(this.client);
        this.incr = util_1.promisify(this.client.incr).bind(this.client);
        this.set = util_1.promisify(this.client.set).bind(this.client);
        this.config = firebaseConfig;
        this.client = client;
        this.prefix = (_b = (_a = firebaseConfig === null || firebaseConfig === void 0 ? void 0 : firebaseConfig.redis) === null || _a === void 0 ? void 0 : _a.prefix) !== null && _b !== void 0 ? _b : "";
    }
}
exports.Cache = Cache;
//# sourceMappingURL=cache.js.map