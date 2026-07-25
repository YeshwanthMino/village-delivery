// src/features/home/views/home/components/DynamicProductCard.tsx

import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Minus, Plus } from 'lucide-react-native';
import React from 'react';
import { DimensionValue, Text, TouchableOpacity, View } from 'react-native';
import { useVillageStore } from '@/src/core/store/useVillageStore';
import { useTranslation } from '@/src/core/utils/useTranslation';
import { useVariantCardView } from '@/src/shared/hooks/useVariantCardView';
import { HomeProduct } from '../../../data/homeLayout.types';
import { Product } from '@/src/base/types/village.types';
import { rupees } from '@/src/shared/utils/currency';

interface Props {
  product: HomeProduct;
  width?: DimensionValue;
  onOpenVariants?: (product: Product) => void;
}

const DynamicProductCardComponent = ({ product, width = 150, onOpenVariants }: Props) => {
  const addToCart = useVillageStore((s) => s.addToCart);
  const decFromCart = useVillageStore((s) => s.decFromCart);
  // The plain (non-sheet) stepper's buttons mutate only this bare-id key, so it
  // must display/gate on this key's own count — not view.count, which sums
  // every cart line for the product including any `${id}-v${i}` variant lines
  // (possible today because ProductCard's sheet threshold differs from this
  // card's, so a product classified "plain" here can still carry a variant line).
  const ownCount = useVillageStore((s) => s.cart[product.id] ?? 0);
  const { t, tOptionCount, tDiscount, locale } = useTranslation();
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
    addToCart(product.id, {
      key: product.id,
      productId: product.id,
      variantIndex: null,
      name: product.title,
      nameTE: product.teluguTitle,
      weight: '',
      price: product.price,
      mrp: product.mrp,
      imageUrl: product.image,
    }, stock);
  };

  return (
    <View className="bg-white border border-slate-100 rounded-2xl overflow-hidden" style={{ width }}>
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

      <View className="p-2.5">
        <TouchableOpacity activeOpacity={0.9} onPress={openDetail}>
          <Text
            className="text-slate-800 text-sm font-semibold"
            numberOfLines={2}
            style={[{ minHeight: 36 }, teFont]}
          >
            {displayTitle}
          </Text>
        </TouchableOpacity>

        {view.packLabel ? (
          <Text className="text-slate-500 text-[11px] mt-1">{view.packLabel}</Text>
        ) : null}

        <View className="flex-row items-center mt-1.5">
          <Text className="text-slate-900 font-bold text-sm">{rupees(view.price)}</Text>
          {view.mrp > view.price ? (
            <Text className="text-slate-400 text-xs line-through ml-1.5">{rupees(view.mrp)}</Text>
          ) : null}
        </View>

        <View className="mt-2">
          {view.mode === 'add' ? (
            <TouchableOpacity
              disabled={!product.inStock}
              onPress={handleAdd}
              className={`rounded-xl py-1.5 items-center border ${product.inStock ? 'border-green-600' : 'border-slate-200'}`}
            >
              <Text className={`font-bold text-sm ${product.inStock ? 'text-green-700' : 'text-slate-400'}`}>
                {t('add')}
              </Text>
              {view.optionsCount > 0 ? (
                <Text className="text-green-700 text-[10px] opacity-70">{tOptionCount(view.optionsCount)}</Text>
              ) : null}
            </TouchableOpacity>
          ) : view.opensSheet ? (
            <TouchableOpacity
              onPress={openSheet}
              accessibilityRole="button"
              accessibilityLabel={`${view.count} in cart, change options`}
              className="flex-row items-center justify-between bg-green-600 rounded-xl px-2 py-2"
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
            <View className="flex-row items-center justify-between bg-green-600 rounded-xl px-2 py-2">
              <TouchableOpacity testID="stepper-dec" onPress={() => decFromCart(product.id)} hitSlop={6}>
                <Minus size={16} color="#ffffff" />
              </TouchableOpacity>
              <Text className="text-white font-bold text-sm">{ownCount}</Text>
              <TouchableOpacity
                testID="stepper-inc"
                onPress={handleAdd}
                disabled={!canAdd}
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
