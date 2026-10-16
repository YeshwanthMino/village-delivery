/**
 * Development-only logging.
 *
 * Every call compiles away to a no-op in release builds. On Android, ungated
 * console output lands in logcat, which is readable by anything holding
 * READ_LOGS and is captured in bug-report dumps — so diagnostics must never
 * reach production.
 *
 * Two rules for callers:
 *  - Never log credentials, tokens (or their lengths), coordinates, addresses,
 *    phone numbers, or full request/response bodies. Log identifiers and
 *    outcomes instead. Dev builds run on real devices too.
 *  - Prefer `logger.error` for genuine faults; it is the only level that stays
 *    meaningful when someone is watching a noisy console.
 *
 * `no-console` is enforced by ESLint so this stays the single entry point.
 */

type LogArgs = unknown[];

const noop = () => {};

 
export const logger = __DEV__
  ? {
      debug: (...args: LogArgs) => console.log(...args),
      warn: (...args: LogArgs) => console.warn(...args),
      error: (...args: LogArgs) => console.error(...args),
    }
  : {
      debug: noop,
      warn: noop,
      error: noop,
    };
 
