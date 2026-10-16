// src/shared/utils/orderLimit.ts
//
// How many units of a variant one order may hold. The API's `maxOrderQuantity`
// is a per-order cap on top of stock, and 0 (or a missing value) means "no
// limit" — so it only ever tightens the stock limit, never zeroes it out.

/** The per-order cap in effect: `maxOrderQuantity` when it is above 0, else none. */
function activeMax(maxOrderQuantity: number | undefined): number | undefined {
  return typeof maxOrderQuantity === 'number' && maxOrderQuantity > 0 ? maxOrderQuantity : undefined;
}

/** Quantity limit for a catalogue variant: stock, tightened by maxOrderQuantity. */
export function orderLimit(stock: number | undefined, maxOrderQuantity: number | undefined): number {
  const available = stock ?? 0;
  const max = activeMax(maxOrderQuantity);
  return max === undefined ? available : Math.min(available, max);
}

/**
 * Limit for a line already in the cart, where the live stock figure may not be
 * known yet (`undefined` = not checked, no stock limit): the tighter of the two,
 * or `undefined` when neither applies.
 */
export function cartLimit(
  availableQuantity: number | undefined,
  maxOrderQuantity: number | undefined,
): number | undefined {
  const max = activeMax(maxOrderQuantity);
  if (availableQuantity === undefined) return max;
  return max === undefined ? availableQuantity : Math.min(availableQuantity, max);
}
