// src/shared/hooks/useVariantCardView.ts
//
// The two store subscriptions every multi-variant product card needs —
// `selectProductCartCount` for the badge total, `selectLastVariantSnapshot`
// for the mirrored variant — plus the `resolveVariantCardView` call that
// turns them into what the card renders. Three components
// (DynamicProductCard, ProductCard, MiniProductCard) would otherwise each
// write this same wiring.
import { Variant } from '@/src/base/types/village.types';
import { selectLastVariantSnapshot, selectProductCartCount, useVillageStore } from '@/src/core/store/useVillageStore';
import { resolveVariantCardView, VariantCardView } from '@/src/shared/utils/variantCardView';

export function useVariantCardView(p: {
  id: string;
  price: number;
  mrp: number;
  weight?: string;
  variants?: Variant[];
  hasVariants?: boolean;
}): VariantCardView {
  const totalCount = useVillageStore(selectProductCartCount(p.id));
  const lastSnapshot = useVillageStore(selectLastVariantSnapshot(p.id));
  return resolveVariantCardView({
    variants: p.variants,
    lastSnapshot,
    totalCount,
    fallbackPrice: p.price,
    fallbackMrp: p.mrp,
    fallbackPackLabel: p.weight,
    forceSheet: p.hasVariants,
  });
}
