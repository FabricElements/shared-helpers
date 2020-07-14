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
        if (!client) {
            throw new Error("Can't get the client from cache");
        }
        this.config = firebaseConfig;
        this.client = client;
        this.prefix = (_b = (_a = firebaseConfig === null || firebaseConfig === void 0 ? void 0 : firebaseConfig.redis) === null || _a === void 0 ? void 0 : _a.prefix) !== null && _b !== void 0 ? _b : null;
        if (!this.prefix) {
            throw new Error("redis prefix is required");
        }
        this.get = util_1.promisify(client.get).bind(client);
        this.set = util_1.promisify(client.set).bind(client);
        this.hgetall = util_1.promisify(client.hgetall).bind(client);
        this.hget = util_1.promisify(client.hget).bind(client);
        this.hset = util_1.promisify(client.hset).bind(client);
        this.exists = util_1.promisify(client.exists).bind(client);
        this.hincrby = util_1.promisify(client.hincrby).bind(client);
        this.hexists = util_1.promisify(client.hexists).bind(client);
    }
}
exports.Cache = Cache;
//# sourceMappingURL=cache.js.map