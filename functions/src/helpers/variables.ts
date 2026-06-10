/**
 * @license
 * Copyright FabricElements. All Rights Reserved.
 */
const localhostUserPort = 5005;
const localhostPort = 5000;
/**
 * Parsed Firebase project configuration derived from the `FIREBASE_CONFIG`
 * environment variable injected by the Firebase Functions runtime.
 */
export const firebaseConfig: any = JSON.parse(process.env.FIREBASE_CONFIG);
/**
 * The Google Cloud project ID for the current Firebase project.
 */
export const projectId = firebaseConfig.projectId;
/**
 * `true` when the Firebase Functions emulator is active (`FUNCTIONS_EMULATOR` env var is set).
 * Use to conditionally enable emulator-only behaviour or skip production guards.
 */
export const emulator = Boolean(process.env.FUNCTIONS_EMULATOR);
/**
 * `true` when the project is running under the beta `fabricelements` project ID.
 * Used to distinguish staging/beta deployments from production.
 */
export const isBeta = projectId === 'fabricelements';
/**
 * `true` when ad test mode is active (beta project or emulator).
 * Used to render Google Ad Manager test ads instead of live impressions.
 */
export const adTest = isBeta || emulator;
/**
 * Primary domain for the current deployment environment.
 * Beta environments use `fabricelements.firebaseapp.com`; production uses `fabricelements.web.app`.
 */
export const domain = isBeta ? 'fabricelements.firebaseapp.com' : 'fabricelements.web.app';
/**
 * Base URL for the user-facing sub-application.
 * Resolves to `http://localhost:5005` in the emulator or `https://user.{domain}` in production.
 */
export const userUrl = emulator ? `http://localhost:${localhostUserPort}` : `https://user.${domain}`;
/**
 * Base URL for the main project application.
 * Resolves to `http://localhost:5000` in the emulator or `https://{domain}` in production.
 */
export const mainUrl = emulator ? `http://localhost:${localhostPort}` : `https://${domain}`;
/**
 * Google Tag Manager container ID for the current environment.
 * Beta projects use `'GTM-WPG25PH'`; production uses `'GTM-P3RZRTV'`.
 */
export const gtag = isBeta ? 'GTM-WPG25PH' : 'GTM-P3RZRTV';
/**
 * Allowed CORS origins for Cloud Functions that restrict cross-origin access.
 * Includes both the user sub-app URL and the main application URL.
 */
export const corsOrigin = [userUrl, mainUrl];
/**
 * AMP CDN origin allowed for CORS on AMP-compatible endpoints.
 */
export const corsAmp = 'https://fabricelements-co.cdn.ampproject.org';
