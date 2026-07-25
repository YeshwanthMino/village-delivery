/**
 * What a product card shows for a product that may have several variants.
 *
 * The rules, in one place because three card components share them:
 * - Nothing in the cart → offer the default (first) variant's price and pack.
 * - Something in the cart → mirror the variant touched most recently, reading it
 *   from that line's cart snapshot rather than re-deriving it from product data.
 * - The quantity shown is the sum across every variant of the product, so it
 *   always agrees with the cart badge.
 * - Only products with more than one variant open the sheet; anything else keeps
 *   the plain add / stepper behaviour.
 */
import { CartSnapshot, Variant } from '@/src/base/types/village.types';

export interface VariantCardView {
  mode: 'add' | 'stepper';
  /** Whether the CTA — including its +/− — should open the variant sheet. */
  opensSheet: boolean;
  price: number;
  mrp: number;
  /** Pack size, e.g. "1 pc (1 L)". Empty when the product has no variants. */
  packLabel: string;
  /** e.g. "2 options". Empty unless the product has more than one variant. */
  optionsLabel: string;
  count: number;
}

export interface VariantCardInput {
  variants: Variant[] | undefined;
  lastSnapshot: CartSnapshot | undefined;
  totalCount: number;
  /** Product-level price/MRP, used when the product has no variant data. */
  fallbackPrice: number;
  fallbackMrp: number;
  /** Set when the list flagged multiple variants but sent no array — the sheet
   *  still has to open, it just has to fetch first. */
  forceSheet?: boolean;
}

export function resolveVariantCardView({
  variants,
  lastSnapshot,
  totalCount,
  fallbackPrice,
  fallbackMrp,
  forceSheet = false,
}: VariantCardInput): VariantCardView {
  const isMulti = (variants?.length ?? 0) > 1;
  const defaultVariant = variants?.[0];
  const mirrorSnapshot = isMulti && totalCount > 0 ? lastSnapshot : undefined;

  return {
    mode: totalCount > 0 ? 'stepper' : 'add',
    opensSheet: isMulti || forceSheet,
    price: mirrorSnapshot?.price ?? defaultVariant?.price ?? fallbackPrice,
    mrp: mirrorSnapshot?.mrp ?? defaultVariant?.mrp ?? fallbackMrp,
    packLabel: mirrorSnapshot?.weight ?? defaultVariant?.name ?? '',
    optionsLabel: isMulti ? `${variants!.length} options` : '',
    count: totalCount,
  };
}
