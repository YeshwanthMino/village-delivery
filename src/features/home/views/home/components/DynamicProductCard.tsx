// src/features/home/views/home/components/DynamicProductCard.tsx

import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Minus, Plus } from 'lucide-react-native';
import React from 'react';
import { DimensionValue, Text, TouchableOpacity, View } from 'react-native';
import { useVillageStore } from '@/src/core/store/useVillageStore';
import { useSnackbarStore } from '@/src/core/store/useSnackbarStore';
import { useTranslation } from '@/src/core/utils/useTranslation';
import { useVariantCardView } from '@/src/shared/hooks/useVariantCardView';
import { HomeProduct } from '../../../data/homeLayout.types';
import { Product } from '@/src/base/types/village.types';
import { rupees } from '@/src/shared/utils/currency';
import { interpolate } from '@/src/base/constants/translations';

// Every CTA this card can render — plain "ADD", "ADD" + options count, the
// variant stepper, and the plain stepper — shares this one fixed height.
// Without it each mode sizes to its own content (a 2-line ADD button taller
// than a 1-line stepper), so two cards in the same grid row visibly mismatch
// the moment one has quantity > 0 and its neighbor doesn't.
const CTA_HEIGHT = 36;

/**
 * The backend often names a single-variant product's own variant after the
 * product itself plus its size — e.g. product "Sri padmavathi Dheepam Oil
 * Packet" with its one variant titled "Sri padmavathi Dheepam Oil Packet
 * ( 30 ml )". Shown as-is under the title, that reads as the product name
 * printed twice with a size tacked on, not a pack-size line. Strip the
 * repeated prefix so only the actually new information (the size) shows —
 * matching the exact-duplicate case just below, which drops the line
 * entirely because it adds nothing at all.
 */
function stripTitlePrefix(label: string, title?: string): string {
  if (!title) return label;
  const trimmedTitle = title.trim();
  if (!trimmedTitle || !label.startsWith(trimmedTitle)) return label;
  return label.slice(trimmedTitle.length).trim();
}

/** Once the title prefix is gone, what's left of a backend variant name is
 *  reliably "( size )" — e.g. "( 30 ml )". The parens made sense trailing
 *  the product name; standing alone as the entire pack label they just add
 *  visual noise around a plain measurement. Unwrap them when they wrap the
 *  whole label; leave a label with parens only in part of it untouched. */
function stripWrappingParens(label: string): string {
  const trimmed = label.trim();
  if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

interface Props {
  product: HomeProduct;
  width?: DimensionValue;
  onOpenVariants?: (product: Product) => void;
  /** Px to float the stock-limit snackbar above the bottom of the screen.
   *  Callers on a screen with a floating tab bar (e.g. the home tab, via
   *  ProductCarouselRow) should pass its height; screens with no tab bar
   *  (search, category details) should omit this to get the correct 0. */
  bottomOffset?: number;
}

const DynamicProductCardComponent = ({ product, width = 150, onOpenVariants, bottomOffset }: Props) => {
  const addToCart = useVillageStore((s) => s.addToCart);
  const decFromCart = useVillageStore((s) => s.decFromCart);
  // The plain (non-sheet) stepper's buttons mutate only this bare-id key, so it
  // must display/gate on this key's own count — not view.count, which sums
  // every cart line for the product including any `${id}-v${i}` variant lines
  // (possible today because ProductCard's sheet threshold differs from this
  // card's, so a product classified "plain" here can still carry a variant line).
  const ownCount = useVillageStore((s) => s.cart[product.id] ?? 0);
  const { t, tDiscount, tVariantCartLabel, tOptionCount, locale } = useTranslation();
  const router = useRouter();
  const openDetail = () => router.push({ pathname: '/product', params: { id: product.id } });

  const teFont = locale === 'te' ? { fontFamily: 'NotoSansTelugu_700Bold' } : undefined;
  const displayTitle = locale === 'te' && product.teluguTitle
    ? product.teluguTitle
    : product.title || 'Product';

  const view = useVariantCardView({
    id: product.id,
    price: product.price,
    mrp: product.mrp,
    variants: product.variants,
    hasVariants: product.hasVariants,
  });

  const stock = product.stock ?? 0;
  const canAdd = ownCount < stock;

  const handlePlainAdd = () => {
    if (!canAdd) {
      useSnackbarStore.getState().show(interpolate(t('stock_limit_reached'), stock), bottomOffset ?? 0);
      return;
    }
    handleAdd();
  };

  // view.mode is derived from the product-wide total (every variant-keyed
  // line included), which is right for the sheet-opening stepper but wrong
  // for the plain branch: a phantom `${id}-v0` line (see ownCount above) would
  // otherwise flip a zero-own-count product into a stepper whose "-" silently
  // no-ops. The plain branch must gate on ownCount instead.
  const mode = view.opensSheet ? view.mode : ownCount > 0 ? 'stepper' : 'add';

  // Badge mirrors the price row above it: view.price/view.mrp track whichever
  // variant was last touched, so the discount must be recomputed from those,
  // not from product.discountPct (fixed at the default variant's discount).
  const discountPct = view.mrp > view.price ? Math.round((1 - view.price / view.mrp) * 100) : 0;

  // With more than one variant the sheet owns every quantity change; the card's
  // controls are display plus a way in. Forward the variants the card already
  // has — once the screens are wired to useVariantSheet, this lets the sheet
  // open without its own network round-trip.
  const openSheet = () => {
    if (onOpenVariants) {
      onOpenVariants({
        id: product.id,
        categoryId: product.categoryId || '',
        name: product.title,
        nameTE: product.teluguTitle ?? '',
        weight: '',
        price: product.price,
        mrp: product.mrp,
        rating: 0,
        reviews: 0,
        stock: product.stock,
        image: product.image,
        variants: product.variants,
      });
      return;
    }
    openDetail();
  };

  const handleAdd = () => {
    if (view.opensSheet) {
      openSheet();
      return;
    }
    // A product with exactly one variant never opens the sheet (see
    // useVariantCardView), but it still HAS a real variant document — price,
    // stock, tax and HSN all live there, not on the product. Carrying its id
    // as variantId keeps this line addressable; omitting it (as a genuinely
    // variant-less product must) previously made single-variant lines
    // indistinguishable from "no variant" downstream (cart lines, stock
    // checks, order placement) — see productMapper.ts's mapVariants comment
    // for the sibling case of this same failure mode.
    const soleVariant = product.variants?.length === 1 ? product.variants[0] : undefined;
    addToCart(product.id, {
      key: product.id,
      productId: product.id,
      variantIndex: null,
      ...(soleVariant ? { variantId: soleVariant.id } : {}),
      name: product.title,
      nameTE: product.teluguTitle,
      weight: soleVariant?.name ?? '',
      price: product.price,
      mrp: product.mrp,
      listPrice: soleVariant?.listPrice,
      dealPrice: soleVariant?.dealPrice,
      imageUrl: product.image,
      images: soleVariant?.images,
      taxType: soleVariant?.taxType,
      taxRate: soleVariant?.taxRate,
      hasFreeItem: soleVariant?.hasFreeItem,
      hsn: soleVariant?.hsn,
    }, stock);
  };

  // A grid caller (CategoryDetailsScreen, SearchScreen) passes width="100%"
  // inside a row wrapper that FlatList's numColumns stretches to the row's
  // tallest card — signalled here by width==='100%' — so this card must grow
  // to fill that stretched height (flex: 1) rather than stay at its own
  // content height, or the taller sibling's extra height just becomes dead
  // space in the wrapper instead of equalizing the two visible cards. A
  // fixed-width carousel card (ProductCarouselRow, ProductDetailScreen) has
  // no such wrapper and no extra space to grow into, so flex: 1 there would
  // be a no-op if applied — skipping it entirely just avoids relying on that.
  const fillsGridRow = width === '100%';

  const cleanedPackLabel = view.packLabel
    ? stripWrappingParens(stripTitlePrefix(stripTitlePrefix(view.packLabel, product.title), product.teluguTitle))
    : '';

  return (
    <View
      className="bg-white border border-slate-100 rounded-2xl overflow-hidden"
      style={{ width, flex: fillsGridRow ? 1 : undefined }}
    >
      <TouchableOpacity activeOpacity={0.9} onPress={openDetail} style={{ position: 'relative' }}>
        <Image
          source={{ uri: product.image }}
          style={{ width: '100%', aspectRatio: 1, backgroundColor: '#f8fafc' }}
          contentFit="cover"
          transition={150}
        />
        {discountPct > 0 ? (
          <View className="absolute top-2 left-2 bg-green-600 rounded-md px-1.5 py-0.5">
            <Text className="text-white text-[10px] font-bold">{tDiscount(discountPct)}</Text>
          </View>
        ) : null}
        {!product.inStock ? (
          <View className="absolute inset-0 bg-white/60 items-center justify-center">
            <Text className="text-slate-700 font-bold text-xs">{t('out_of_stock')}</Text>
          </View>
        ) : null}
      </TouchableOpacity>

      <View className="p-2.5" style={{ flex: 1 }}>
        <TouchableOpacity activeOpacity={0.9} onPress={openDetail}>
          <Text
            className="text-slate-800 text-sm font-semibold"
            numberOfLines={2}
            style={[{ minHeight: 36 }, teFont]}
          >
            {displayTitle}
          </Text>
        </TouchableOpacity>

        {/* No chevron here even for a multi-variant product: the ADD
         *  button's own "N options" line already signals that this card
         *  opens a picker, so a second indicator next to the pack label
         *  was a redundant, duplicate affordance. */}
        {cleanedPackLabel ? (
          <Text className="text-slate-500 text-[11px] mt-1">{cleanedPackLabel}</Text>
        ) : null}

        {/* A product with no populated variant and no product-level price
         *  field (seen on some incompletely-catalogued, always-out-of-stock
         *  records) maps to price 0 — there's no real number anywhere in the
         *  payload to fall back to. Showing "₹0" reads as a real price, not
         *  as "unknown," so skip the row rather than print a false one. */}
        {view.price > 0 ? (
          <View className="flex-row items-center mt-1.5">
            <Text className="text-slate-900 font-bold text-sm">{rupees(view.price)}</Text>
            {view.mrp > view.price ? (
              <Text className="text-slate-400 text-xs line-through ml-1.5">{rupees(view.mrp)}</Text>
            ) : null}
          </View>
        ) : null}

        {/* Consumes whatever height the grid row's stretch handed this card
         *  beyond its own content — zero-height (a no-op) for a fixed-width
         *  carousel card with nothing extra to give. Pins the CTA to the
         *  bottom so two cards in the same grid row line up their buttons
         *  even when one has a longer title or an extra pack-label line. */}
        <View style={{ flex: 1 }} />

        <View className="mt-2">
          {mode === 'add' ? (
            <TouchableOpacity
              disabled={!product.inStock}
              onPress={handleAdd}
              // Fixed height regardless of one line ("ADD") or two ("ADD" +
              // options count) — every add-mode button in the grid must be
              // the same size, matching the reference: a competitor's plain
              // "ADD" button is padded to match its 2-line neighbor's height,
              // not left to size to its own (shorter) content. "ADD" itself
              // stays full size in both cases — the reference keeps it the
              // dominant label and lets "N options" read as a quiet, muted
              // caption underneath, rather than shrinking ADD to make room.
              className={`rounded-xl items-center justify-center border ${product.inStock ? 'border-green-600' : 'border-slate-200'}`}
              style={{ minHeight: CTA_HEIGHT, paddingVertical: 3 }}
            >
              <Text
                className={`font-bold text-sm ${product.inStock ? 'text-green-700' : 'text-slate-400'}`}
                style={{ lineHeight: 15 }}
              >
                {t('add')}
              </Text>
              {view.opensSheet ? (
                <Text
                  testID="add-button-options-count"
                  className={`text-[10px] font-medium tracking-wide ${product.inStock ? 'text-green-700/70' : 'text-slate-400'}`}
                  style={{ lineHeight: 11 }}
                >
                  {tOptionCount(view.optionsCount)}
                </Text>
              ) : null}
            </TouchableOpacity>
          ) : view.opensSheet ? (
            <TouchableOpacity
              onPress={openSheet}
              accessibilityRole="button"
              accessibilityLabel={tVariantCartLabel(view.count)}
              className="flex-row items-center justify-between bg-green-600 rounded-xl px-2"
              style={{ minHeight: CTA_HEIGHT }}
            >
              {/* The − / count / + below are display only — the whole row opens
                  the sheet as one control, so these two Views intentionally
                  carry no onPress of their own. Don't wire one up separately. */}
              <View testID="variant-stepper-dec" className="px-1" accessible={false}>
                <Minus size={16} color="#ffffff" />
              </View>
              <Text className="text-white font-bold text-sm">{view.count}</Text>
              <View testID="variant-stepper-inc" className="px-1" accessible={false}>
                <Plus size={16} color="#ffffff" />
              </View>
            </TouchableOpacity>
          ) : (
            <View
              className="flex-row items-center justify-between bg-green-600 rounded-xl px-2"
              style={{ minHeight: CTA_HEIGHT }}
            >
              <TouchableOpacity testID="stepper-dec" onPress={() => decFromCart(product.id)} hitSlop={6}>
                <Minus size={16} color="#ffffff" />
              </TouchableOpacity>
              <Text className="text-white font-bold text-sm">{ownCount}</Text>
              <TouchableOpacity
                testID="stepper-inc"
                onPress={handlePlainAdd}
                hitSlop={6}
                style={{ opacity: canAdd ? 1 : 0.5 }}
              >
                <Plus size={16} color={canAdd ? '#ffffff' : '#d1d5db'} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

// Rails render many of these; without memo each one re-rendered on every parent
// update and re-ran its NativeWind class resolution.
export const DynamicProductCard = React.memo(DynamicProductCardComponent);
