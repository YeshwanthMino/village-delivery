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
  const { t, tOptionCount, locale } = useTranslation();
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
  const canAdd = view.count < stock;

  // With more than one variant the sheet owns every quantity change; the card's
  // controls are display plus a way in. Forward the variants the card already
  // has so the sheet can open without its own network round-trip.
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
        {product.discountPct > 0 ? (
          <View className="absolute top-2 left-2 bg-green-600 rounded-md px-1.5 py-0.5">
            <Text className="text-white text-[10px] font-bold">{product.discountPct}% OFF</Text>
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
              className="flex-row items-center justify-between bg-green-600 rounded-xl px-2 py-2"
            >
              <View testID="variant-stepper-dec" className="px-1">
                <Minus size={16} color="#ffffff" />
              </View>
              <Text className="text-white font-bold text-sm">{view.count}</Text>
              <View testID="variant-stepper-inc" className="px-1">
                <Plus size={16} color="#ffffff" />
              </View>
            </TouchableOpacity>
          ) : (
            <View className="flex-row items-center justify-between bg-green-600 rounded-xl px-2 py-2">
              <TouchableOpacity testID="stepper-dec" onPress={() => decFromCart(product.id)} hitSlop={6}>
                <Minus size={16} color="#ffffff" />
              </TouchableOpacity>
              <Text className="text-white font-bold text-sm">{view.count}</Text>
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
