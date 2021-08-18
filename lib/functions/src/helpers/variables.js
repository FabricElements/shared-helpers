"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.corsAmp = exports.corsOrigin = exports.gtag = exports.mainUrl = exports.userUrl = exports.domain = exports.adTest = exports.isBeta = exports.emulator = exports.projectId = exports.firebaseConfig = void 0;
/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
const localhostUserPort = 5005;
const localhostPort = 5000;
exports.firebaseConfig = JSON.parse(process.env.FIREBASE_CONFIG);
exports.projectId = exports.firebaseConfig.projectId;
exports.emulator = Boolean(process.env.FUNCTIONS_EMULATOR);
exports.isBeta = exports.projectId === "fabricelements";
exports.adTest = exports.isBeta || exports.emulator;
exports.domain = exports.isBeta ? "fabricelements.firebaseapp.com" : "fabricelements.web.app";
exports.userUrl = exports.emulator ? `http://localhost:${localhostUserPort}` : `https://user.${exports.domain}`;
exports.mainUrl = exports.emulator ? `http://localhost:${localhostPort}` : `https://${exports.domain}`;
exports.gtag = exports.isBeta ? "GTM-WPG25PH" : "GTM-P3RZRTV";
exports.corsOrigin = [exports.userUrl, exports.mainUrl];
exports.corsAmp = "https://fabricelements-co.cdn.ampproject.org";
//# sourceMappingURL=variables.js.map