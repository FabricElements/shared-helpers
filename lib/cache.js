"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.Cache = void 0;
const util_1 = require("util");
const projectId = String((_a = process === null || process === void 0 ? void 0 : process.env) === null || _a === void 0 ? void 0 : _a.GCLOUD_PROJECT);
const isBeta = projectId.search("beta") >= 0;
const baseCall = async (op1, op2, op3) => {
    return;
};
const baseCallString = async (op1, op2, op3) => {
    return;
};
/**
 * Cache
 */
class Cache {
    constructor(firebaseConfig = {}, client) {
        var _a, _b;
        this.del = baseCall;
        this.exists = baseCall;
        this.flushall = baseCall;
        this.flushdb = baseCall;
        this.get = baseCallString;
        this.hdel = baseCall;
        this.hexists = baseCall;
        this.hget = baseCallString;
        this.hgetall = baseCall;
        this.hincrby = baseCall;
        this.hset = baseCall;
        this.incr = baseCall;
        this.set = baseCall;
        this.setex = baseCall;
        this.willCache = false;
        try {
            this.config = firebaseConfig;
            this.prefix = (_b = (_a = firebaseConfig === null || firebaseConfig === void 0 ? void 0 : firebaseConfig.redis) === null || _a === void 0 ? void 0 : _a.prefix) !== null && _b !== void 0 ? _b : null;
            this.willCache = !isBeta && client && (client === null || client === void 0 ? void 0 : client.connected);
        }
        catch (error) {
        }
        if (this.willCache) {
            this.client = client;
            this.del = util_1.promisify(client.del).bind(client);
            this.exists = util_1.promisify(client.exists).bind(client);
            this.flushdb = util_1.promisify(client.flushdb).bind(client);
            this.flushall = util_1.promisify(client.flushall).bind(client);
            this.get = util_1.promisify(client.get).bind(client);
            this.hget = util_1.promisify(client.hget).bind(client);
            this.hgetall = util_1.promisify(client.hgetall).bind(client);
            this.hset = util_1.promisify(client.hset).bind(client);
            this.hdel = util_1.promisify(client.hdel).bind(client);
            this.hincrby = util_1.promisify(client.hincrby).bind(client);
            this.hexists = util_1.promisify(client.hexists).bind(client);
            this.set = util_1.promisify(client.set).bind(client);
            this.setex = util_1.promisify(client.setex).bind(client);
            this.incr = util_1.promisify(client.incr).bind(client);
        }
        else {
            if (isBeta) {
                console.warn("Can't get the client from cache");
            }
            return;
        }
    }
}
exports.Cache = Cache;
//# sourceMappingURL=cache.js.map