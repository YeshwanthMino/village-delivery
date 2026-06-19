// src/features/home/views/home/components/DynamicProductCard.tsx

import { Image } from 'expo-image';
import { Minus, Plus } from 'lucide-react-native';
import React from 'react';
import { DimensionValue, Text, TouchableOpacity, View } from 'react-native';
import { useVillageStore } from '@/src/core/store/useVillageStore';
import { useTranslation } from '@/src/core/utils/useTranslation';
import { HomeProduct } from '../../../data/homeLayout.types';

interface Props {
  product: HomeProduct;
  width?: DimensionValue;
}

export const DynamicProductCard = ({ product, width = 150 }: Props) => {
  const cart = useVillageStore((s) => s.cart);
  const addToCart = useVillageStore((s) => s.addToCart);
  const decFromCart = useVillageStore((s) => s.decFromCart);
  const { locale } = useTranslation();

  const count = cart[product.id] ?? 0;
  const teFont = locale === 'te' ? { fontFamily: 'NotoSansTelugu_700Bold' } : undefined;
  const displayTitle = locale === 'te' && product.teluguTitle ? product.teluguTitle : product.title;

  // API prices are real rupees; cart pipeline works in "units" (display ×20).
  const handleAdd = () =>
    addToCart(product.id, {
      key: product.id,
      productId: product.id,
      variantIndex: null,
      name: product.title,
      nameTE: product.teluguTitle,
      weight: '',
      price: product.price / 20,
      mrp: product.mrp / 20,
      imageUrl: product.image,
    });

  return (
    <View className="bg-white border border-slate-100 rounded-2xl overflow-hidden" style={{ width }}>
      <View style={{ position: 'relative' }}>
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
            <Text className="text-slate-700 font-bold text-xs">Out of stock</Text>
          </View>
        ) : null}
      </View>

      <View className="p-2.5">
        <Text
          className="text-slate-800 text-sm font-semibold"
          numberOfLines={2}
          style={[{ minHeight: 36 }, teFont]}
        >
          {displayTitle}
        </Text>

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
                ADD
              </Text>
            </TouchableOpacity>
          ) : (
            <View className="flex-row items-center justify-between bg-green-600 rounded-xl px-2 py-2">
              <TouchableOpacity onPress={() => decFromCart(product.id)} hitSlop={6}>
                <Minus size={16} color="#ffffff" />
              </TouchableOpacity>
              <Text className="text-white font-bold text-sm">{count}</Text>
              <TouchableOpacity onPress={handleAdd} hitSlop={6}>
                <Plus size={16} color="#ffffff" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};
