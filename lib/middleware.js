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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.middlewareSecurityMedia = exports.middlewareSecurityChild = exports.middlewareCookie = exports.middlewareErrorPage = exports.middlewareErrorAPI = void 0;
/**
 * @license
 * Copyright Erny Sans. All Rights Reserved.
 */
const cors_1 = __importDefault(require("cors"));
const functions = __importStar(require("firebase-functions"));
const variables_js_1 = require("./variables.js");
const emulator = Boolean(process.env.FUNCTIONS_EMULATOR);
const config = functions.config();
const zapier = config === null || config === void 0 ? void 0 : config.zapier;
const cacheTime = variables_js_1.isBeta ? 1 : 3600; // 1 hour
const getToken = (request) => {
    let token = null;
    if (request.headers.authorization && request.headers.authorization.split(" ")[0] === "Bearer") {
        token = request.headers.authorization.split(" ")[1];
    }
    else if (request.query && request.query.token) {
        token = request.query.token;
    }
    return token && token.length > 20 ? token : null;
};
const _formatError = (error) => {
    const responseMessage = {
        title: error.name || "error",
        detail: error.message,
        status: error.statusCode || 400,
    };
    if (variables_js_1.isBeta)
        responseMessage.source = error.stack || "";
    if (error.name === "UnauthorizedError" || error.message === "UnauthorizedError") {
        responseMessage.title = "UnauthorizedError";
        responseMessage.detail = responseMessage.message || "Invalid token";
        responseMessage.status = 401;
    }
    responseMessage.error = responseMessage.title;
    responseMessage.error_description = responseMessage.detail;
    return responseMessage;
};
const middlewareErrorAPI = (error, request, response, next) => {
    if (error) {
        const responseMessage = _formatError(error);
        response.set("Cache-Control", "no-cache, no-store");
        response.status(responseMessage.status).json(responseMessage);
    }
    else {
        next(null, false);
    }
};
exports.middlewareErrorAPI = middlewareErrorAPI;
const middlewareErrorPage = (error, req, response, next) => {
    if (error) {
        if (variables_js_1.isBeta)
            console.error(error);
        const responseMessage = _formatError(error);
        if (error.name === "UnauthorizedError" || error.message === "UnauthorizedError") {
            response.set("Cache-Control", "no-cache, no-store");
            // if (error.error === "UnauthorizedError" || error.error === "UnauthorizedError") {
            response.redirect("/signin");
            return null;
        }
        let errorPage = "public/error.pug";
        switch (responseMessage.status) {
            case 404:
                errorPage = "public/404.pug";
                response.set("Cache-Control", `immutable, public, max-age=${cacheTime}, s-maxage=${cacheTime}, min-fresh=${cacheTime}`); // only cache if method changes to get
                break;
            default:
                response.set("Cache-Control", "no-cache, no-store");
        }
        response.status(responseMessage.status).render(errorPage, {
            gtag: variables_js_1.gtag, domain: variables_js_1.domain, isBeta: variables_js_1.isBeta, userUrl: variables_js_1.userUrl,
        });
    }
    else {
        next(null, false);
    }
};
exports.middlewareErrorPage = middlewareErrorPage;
const middlewareCookie = (request, response, next) => {
    var _a;
    if (!((_a = request.cookies) === null || _a === void 0 ? void 0 : _a.xsrfToken))
        response.cookie("XSRF-TOKEN", request.csrfToken());
    next();
};
exports.middlewareCookie = middlewareCookie;
const middlewareSecurityChild = (request, response, next) => {
    response.set("X-Powered-By", "Nexuss");
    next();
};
exports.middlewareSecurityChild = middlewareSecurityChild;
/**
 * Middleware security options
 */
// const domainMatchRegex = new RegExp(/\.google\.com$/);
// const originWhitelist = ["http://localhost:5000", `https://${domain}`, "https://nexuss-co.cdn.ampproject.org", "https://cdn.ampproject.org", "https://www.googletagmanager.com", "www.googletagmanager.com"];
const defaultSrc = ["'self'", "nexuss.co", "*.nexuss.co", "cdn.ampproject.org", "*.ampproject.net", "*.google.com", "*.googleapis.com", "*.doubleclick.net", "www.google-analytics.com", "*.cloudfunctions.net"];
if (emulator) {
    defaultSrc.push("http://localhost:5005");
    defaultSrc.push("http://localhost:5000");
    defaultSrc.push("http://localhost:5001");
    defaultSrc.push("http://localhost:9099");
}
exports.middlewareSecurityMedia = [
    cors_1.default({
        exposedHeaders: [],
        origin: "*",
    }),
    exports.middlewareSecurityChild,
];
//# sourceMappingURL=middleware.js.map