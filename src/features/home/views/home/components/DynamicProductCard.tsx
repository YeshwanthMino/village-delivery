// src/features/home/views/home/components/DynamicProductCard.tsx

import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Minus, Plus } from 'lucide-react-native';
import React, { useState } from 'react';
import { DimensionValue, Text, TouchableOpacity, View } from 'react-native';
import { useVillageStore } from '@/src/core/store/useVillageStore';
import { useTranslation } from '@/src/core/utils/useTranslation';
import { VariantBottomSheet } from '@/src/shared/components/VariantBottomSheet';
import { HomeProduct } from '../../../data/homeLayout.types';
import { Product } from '@/src/base/types/village.types';
import { toUnits } from '@/src/shared/utils/currency';

interface Props {
  product: HomeProduct;
  width?: DimensionValue;
  onOpenVariants?: (product: Product) => void;
}

const DynamicProductCardComponent = ({ product, width = 150, onOpenVariants }: Props) => {
  const [isLoading, setIsLoading] = useState(false);
  // Subscribe to this card's own line, not the whole cart object: addToCart
  // replaces `cart`, so selecting it re-rendered every card in every rail on any
  // stepper tap.
  const count = useVillageStore((s) => s.cart[product.id] ?? 0);
  const addToCart = useVillageStore((s) => s.addToCart);
  const decFromCart = useVillageStore((s) => s.decFromCart);
  const { t, locale } = useTranslation();
  const router = useRouter();
  const openDetail = () => router.push({ pathname: '/product', params: { id: product.id } });

  const teFont = locale === 'te' ? { fontFamily: 'NotoSansTelugu_700Bold' } : undefined;
  const displayTitle = locale === 'te' && product.teluguTitle
    ? product.teluguTitle
    : product.title || 'Product';
  const hasMultipleVariants = product.hasVariants;
  const stock = product.stock ?? 0;
  const canAdd = count < stock;

  const handleAdd = () => {
    // If product has multiple variants and callback is provided, open variant sheet
    if (hasMultipleVariants && onOpenVariants) {
      // Create a minimal Product object for the callback
      // The parent component should fetch full product with variants
      const minimalProduct: Product = {
        id: product.id,
        categoryId: product.categoryId || '',
        name: product.title,
        nameTE: product.teluguTitle ?? '',
        weight: '',
        price: product.price,
        mrp: product.mrp,
        rating: 0,
        reviews: 0,
      };
      onOpenVariants(minimalProduct);
      return;
    }
    // If product has variants but no callback, go to detail page
    if (hasMultipleVariants) {
      openDetail();
      return;
    }
    // Otherwise, add directly to cart
    addToCart(product.id, {
      key: product.id,
      productId: product.id,
      variantIndex: null,
      name: product.title,
      nameTE: product.teluguTitle,
      weight: '',
      price: toUnits(product.price),
      mrp: toUnits(product.mrp),
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

        <View className="flex-row items-center mt-1.5">
          <Text className="text-slate-900 font-bold text-sm">₹{Math.round(product.price)}</Text>
          {product.discountPct > 0 ? (
            <Text className="text-slate-400 text-xs line-through ml-1.5">₹{Math.round(product.mrp)}</Text>
          ) : null}
        </View>

        <View className="mt-2">
          {count === 0 ? (
            <TouchableOpacity
              disabled={!product.inStock}
              onPress={handleAdd}
              className={`rounded-xl py-2 items-center border ${product.inStock ? 'border-green-600' : 'border-slate-200'}`}
            >
              <Text className={`font-bold text-sm ${product.inStock ? 'text-green-700' : 'text-slate-400'}`}>
                {hasMultipleVariants ? 'OPTIONS' : 'ADD'}
              </Text>
            </TouchableOpacity>
          ) : (
            <View className="flex-row items-center justify-between bg-green-600 rounded-xl px-2 py-2">
              <TouchableOpacity onPress={() => decFromCart(product.id)} hitSlop={6}>
                <Minus size={16} color="#ffffff" />
              </TouchableOpacity>
              <Text className="text-white font-bold text-sm">{count}</Text>
              <TouchableOpacity onPress={handleAdd} disabled={!canAdd} hitSlop={6} style={{ opacity: canAdd ? 1 : 0.5 }}>
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
