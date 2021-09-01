"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
const functions = __importStar(require("firebase-functions"));
const node_fetch_1 = __importDefault(require("node-fetch"));
/**
 * Call firebase project base API
 * @param apiName
 * @param path
 * @param body
 */
exports.default = (apiName, path, body = {}) => __awaiter(void 0, void 0, void 0, function* () {
    const config = functions.config();
    const apiBase = config[apiName];
    if (!(apiName || apiBase)) {
        throw new Error("Invalid api call");
    }
    const finalBody = JSON.stringify(body);
    let requestOptions = {
        method: "POST",
        headers: {
            "authorization": `Bearer ${apiBase.token}`,
            "Accept": "application/json",
            "Content-Type": "application/json"
        },
        body: finalBody,
        redirect: "error",
        // The following properties are node-fetch extensions
        follow: 0,
        timeout: 60000,
        // Signal is recommended instead.
        size: 0,
        agent: null // http(s).Agent instance, allows custom proxy, certificate, dns lookup etc.
    };
    const apiPath = `https://${apiBase.id}.firebaseapp.com/api/${path}`;
    try {
        const request = yield (0, node_fetch_1.default)(apiPath, requestOptions);
        const bodyJson = yield request.json();
        if (request.status !== 200) {
            if (request.status === 500) {
                throw new Error(`${apiName} isn't available`);
            }
            throw new Error(bodyJson.message || "unknown error");
        }
        return bodyJson;
    }
    catch (error) {
        throw new Error(error.message);
    }
});
//# sourceMappingURL=api-request.js.map