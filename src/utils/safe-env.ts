// A helper file for browser-safe environment access
export const safeEnv = {
  get NODE_ENV() {
    return typeof import.meta !== 'undefined' ? import.meta.env?.MODE : 'production';
  },
  get isDev() {
    return typeof import.meta !== 'undefined' ? import.meta.env?.DEV : false;
  },
  get isTest() {
    return typeof import.meta !== 'undefined'
      ? import.meta.env?.MODE === 'test' || import.meta.env?.VITEST === 'true'
      : false;
  },
  get isProduction() {
    return !this.isDev && !this.isTest;
  },
  // Log helper - only logs in development
  log(...args: unknown[]) {
    if (this.isDev) {
      console.log(...args);
    }
  },
};
