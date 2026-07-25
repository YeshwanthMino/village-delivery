/**
 * What a product card shows for a product that may have several variants.
 *
 * The rules, in one place because three card components share them:
 * - Nothing in the cart → offer the default (first) variant's price and pack.
 * - Something in the cart → mirror the variant touched most recently, reading it
 *   from that line's cart snapshot rather than re-deriving it from product data
 *   (a snapshot pins the price/pack at add time, so a later repricing of the
 *   catalog doesn't retroactively change what an already-added line shows).
 * - The quantity shown is the sum across every variant of the product, so it
 *   always agrees with the cart badge.
 * - Only products with more than one variant open the sheet; anything else keeps
 *   the plain add / stepper behaviour.
 *
 * `price`/`mrp` cross this function as raw internal units (see currency.ts) —
 * render them with `rupees()`, never interpolate them directly.
 *
 * This is a pure util with no locale: `optionsCount` is a number, not a
 * rendered string, so a caller can translate/pluralize it ("2 options" /
 * "2 ఎంపికలు") instead of a fixed English label being baked in here.
 */
import { CartSnapshot, Variant } from '@/src/base/types/village.types';

export interface VariantCardView {
  mode: 'add' | 'stepper';
  /** Whether the CTA — including its +/− — should open the variant sheet. */
  opensSheet: boolean;
  price: number;
  mrp: number;
  /** Pack size, e.g. "1 pc (1 L)". Empty when nothing describes one. */
  packLabel: string;
  /** How many variants the product has. 0 unless it has more than one —
   *  callers turn this into a label ("2 options") only past that point. */
  optionsCount: number;
  count: number;
  // Deliberately no `variantIndex`/cart-key here: the view answers "what to
  // show", not "which line to mutate". A caller that needs to act on the
  // mirrored variant derives its own cart key (e.g. from the snapshot it
  // already holds), rather than this util assuming a key format.
}

export interface VariantCardInput {
  variants: Variant[] | undefined;
  lastSnapshot: CartSnapshot | undefined;
  totalCount: number;
  /** Product-level price/MRP, used when the product has no variant data. */
  fallbackPrice: number;
  fallbackMrp: number;
  /** Product-level pack label (e.g. a static catalog item's `weight`), used
   *  when the product has no variant data of its own. */
  fallbackPackLabel?: string;
  /** Escape hatch for a product flagged as multi-variant without its variants
   *  present (no current mapper produces this, but useVariantSheet's fetch-on-tap
   *  fallback depends on the sheet still being able to open in that case). */
  forceSheet?: boolean;
}

export function resolveVariantCardView({
  variants,
  lastSnapshot,
  totalCount,
  fallbackPrice,
  fallbackMrp,
  fallbackPackLabel,
  forceSheet = false,
}: VariantCardInput): VariantCardView {
  const isMulti = (variants?.length ?? 0) > 1;
  const defaultVariant = variants?.[0];
  const mirrorSnapshot = isMulti && totalCount > 0 ? lastSnapshot : undefined;

  return {
    mode: totalCount > 0 ? 'stepper' : 'add',
    opensSheet: isMulti || forceSheet,
    // Price/mrp: `??` is deliberate — a legitimate ₹0 line (hasFreeItem) must
    // not fall through to the next source just because 0 is falsy.
    price: mirrorSnapshot?.price ?? defaultVariant?.price ?? fallbackPrice,
    mrp: mirrorSnapshot?.mrp ?? defaultVariant?.mrp ?? fallbackMrp,
    // packLabel: `||` is deliberate — an empty-string label from a
    // badly-mapped variant/snapshot isn't meaningful and should fall through,
    // unlike price/mrp there's no legitimate "" pack size to preserve.
    packLabel: mirrorSnapshot?.weight || defaultVariant?.name || fallbackPackLabel || '',
    optionsCount: isMulti ? variants!.length : 0,
    count: totalCount,
  };
}
