/**
 * Cart keys.
 *
 * A cart line is addressed by `productId` for a plain product, or
 * `${productId}-v${variantIndex}` for a variant. This was previously parsed in
 * two places with two different implementations — a regex in useVillageStore and
 * a `lastIndexOf('-v')` scan in the bill engine. They happened to agree, but one
 * rule deserves one implementation.
 */

export interface ParsedCartKey {
  productId: string;
  variantIndex: number | null;
}

const VARIANT_KEY = /^(.+)-v(\d+)$/;

export function cartKeyFor(productId: string, variantIndex: number | null): string {
  return variantIndex === null ? productId : `${productId}-v${variantIndex}`;
}

export function parseCartKey(key: string): ParsedCartKey {
  const match = VARIANT_KEY.exec(key);
  // The capture is greedy, so a productId that itself contains "-v<digits>"
  // still resolves against the *last* such segment — the one this app appends.
  if (match) {
    return { productId: match[1], variantIndex: parseInt(match[2], 10) };
  }
  return { productId: key, variantIndex: null };
}
