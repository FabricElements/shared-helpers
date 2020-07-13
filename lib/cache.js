"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rset = exports.rget = exports.rincr = exports.client = exports.port = exports.host = void 0;
/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
const functions = require("firebase-functions");
const redis = require("redis");
const util_1 = require("util");
const config = functions.config();
exports.host = config.redis.host;
exports.port = Number(config.redis.port);
exports.client = redis.createClient(exports.port, exports.host);
exports.rincr = util_1.promisify(exports.client.incr).bind(exports.client);
exports.rget = util_1.promisify(exports.client.get).bind(exports.client);
exports.rset = util_1.promisify(exports.client.set).bind(exports.client);
//# sourceMappingURL=cache.js.map