/**
 * Money formatting, and the unit convention behind it.
 *
 * ## The convention
 *
 * Prices are carried through the app in **units**, not rupees, where
 * `1 unit = 1/20 ₹`. Everything downstream of the cart — snapshots, line items,
 * `computeBill`, order totals — is in units. `rupees()` is the single boundary
 * that converts units to a displayable rupee string.
 *
 * The factor originates in the static demo catalog, whose prices were authored
 * pre-multiplier. Real API prices arrive in rupees and are divided by
 * `UNITS_PER_RUPEE` on the way into the cart (see the product card and product
 * detail view models) and by `ordersApi.toUnits` on the way in from order
 * history, so both sources meet in the same unit space.
 *
 * ## Why this file exists
 *
 * The formatter previously lived inside `villageData.ts`, a 1100-line file of
 * demo catalog data, alongside the bill engine. Any component that needed to
 * format a number pulled the entire mock dataset into its module graph, and the
 * multiplier was invisible at the call site — which is how a screen came to
 * interpolate a raw unit value behind a `₹` sign and show 1/20th of the real
 * amount.
 *
 * ## Rules for callers
 *
 * - Never interpolate a price directly (`₹{total}`). Always call `rupees()`.
 * - Never apply the factor by hand. Use `toUnits` / `UNITS_PER_RUPEE`.
 */

/** Internal price units per rupee. */
export const UNITS_PER_RUPEE = 20;

/** Convert a rupee amount from an external source into internal units. */
export function toUnits(rupeeAmount: number): number {
  return rupeeAmount / UNITS_PER_RUPEE;
}

/** Format an internal unit amount as a rupee string for display. */
export function rupees(units: number): string {
  return '₹' + Math.round(units * UNITS_PER_RUPEE);
}

/** Format an internal unit amount as a rupee string, rounding up.
 *  For shortfall-style messages ("add ₹X more") where rounding down
 *  could display ₹0 while the threshold is still unmet. */
export function rupeesCeil(units: number): string {
  return '₹' + Math.ceil(units * UNITS_PER_RUPEE);
}
