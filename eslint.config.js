// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*", "android/*", "ios/*"],
  },
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    rules: {
      // Ungated console output ships to release and lands in logcat, where it is
      // readable by anything holding READ_LOGS and captured in bug reports. Route
      // diagnostics through src/base/services/logger, which compiles to a no-op
      // outside __DEV__.
      "no-console": "error",
      // Effect dependency mistakes have caused real bugs here — stale stock
      // verification and wiped cart adjustments — so surface them.
      "react-hooks/exhaustive-deps": "warn",
    },
  },
  {
    // The logger is the one place console is the implementation.
    files: ["src/base/services/logger.ts"],
    rules: { "no-console": "off" },
  },
  {
    files: ["**/__tests__/**", "**/*.test.{ts,tsx}", "jest.setup.js"],
    rules: { "no-console": "off" },
  },
]);
