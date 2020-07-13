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
        if (!this.client) {
            throw new Error("Can't get the client from cache");
        }
        this.config = firebaseConfig;
        this.client = client;
        this.prefix = (_b = (_a = firebaseConfig === null || firebaseConfig === void 0 ? void 0 : firebaseConfig.redis) === null || _a === void 0 ? void 0 : _a.prefix) !== null && _b !== void 0 ? _b : "";
        this.getCache = util_1.promisify(client.get).bind(client);
        this.setCache = util_1.promisify(client.set).bind(client);
    }
}
exports.Cache = Cache;
//# sourceMappingURL=cache.js.map