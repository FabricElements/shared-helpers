/**
 * Indicates whether the Firebase Functions emulator is currently active.
 * Derived from the `FUNCTIONS_EMULATOR` environment variable set by the
 * Firebase Local Emulator Suite. Use this flag to enable emulator-only
 * logging or bypass production-only guards during local development.
 */
export const emulator = Boolean(process.env.FUNCTIONS_EMULATOR);
