/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
const localhostUserPort = 5005;
const localhostPort = 5000;
export const firebaseConfig: any = JSON.parse(process.env.FIREBASE_CONFIG);
export const projectId = firebaseConfig.projectId;
export const emulator = Boolean(process.env.FUNCTIONS_EMULATOR);
export const isBeta = projectId === "fabricelements";
export const adTest = isBeta || emulator;
export const domain = isBeta ? "fabricelements.firebaseapp.com" : "fabricelements.web.app";
export const userUrl = emulator ? `http://localhost:${localhostUserPort}` : `https://user.${domain}`;
export const mainUrl = emulator ? `http://localhost:${localhostPort}` : `https://${domain}`;
export const gtag = isBeta ? "GTM-WPG25PH" : "GTM-P3RZRTV";
export const corsOrigin = [userUrl, mainUrl];
export const corsAmp = "https://fabricelements-co.cdn.ampproject.org";
