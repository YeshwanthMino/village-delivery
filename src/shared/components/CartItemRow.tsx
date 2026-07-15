import { Image } from 'expo-image';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { AlertCircle } from 'lucide-react-native';
import { CartLineItem } from '@/src/base/types/village.types';
import { rupees } from '@/src/features/home/data/static/villageData';
import { useVillageStore } from '@/src/core/store';
import { FullWidthStepper } from './FullWidthStepper';
import { useTranslation } from '@/src/core/utils/useTranslation';

interface StockStatus {
  inStock: boolean;
  availableQuantity?: number;
}

interface CartItemRowProps {
  item: CartLineItem;
  stockStatus?: StockStatus;
  onOutOfStockPress?: () => void;
}

export const CartItemRow = ({ item, stockStatus, onOutOfStockPress }: CartItemRowProps) => {
  const addToCart = useVillageStore(state => state.addToCart);
  const decFromCart = useVillageStore(state => state.decFromCart);
  const { locale } = useTranslation();

  const displayName = locale === 'te' && item.nameTE ? item.nameTE : item.name;

  const discount = item.mrp > item.price
    ? Math.round((1 - item.price / item.mrp) * 100)
    : 0;

  const isOutOfStock = stockStatus && !stockStatus.inStock;

  return (
    <View className={`bg-white border rounded-2xl p-2.5 flex-row items-center gap-3 ${
      isOutOfStock ? 'border-red-200 opacity-70' : 'border-slate-100'
    }`}>
      {item.imageUrl ? (
        <View className="w-16 h-16 rounded-xl overflow-hidden bg-slate-50 relative">
          <Image
            source={{ uri: item.imageUrl }}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
            transition={150}
          />
          {discount > 0 && (
            <View className="absolute top-0 left-0 bg-green-600 rounded-tl-xl rounded-br-xl px-1 py-0.5">
              <Text className="text-white text-[8px] font-extrabold">{discount}%</Text>
            </View>
          )}
          {isOutOfStock && (
            <View className="absolute inset-0 bg-black/40 items-center justify-center rounded-xl" />
          )}
        </View>
      ) : (
        <View className={`w-16 h-16 rounded-xl bg-gradient-to-br ${item.gradientFrom} ${item.gradientTo} items-center justify-center relative`}>
          <Text style={{ fontSize: 32 }}>{item.emoji}</Text>
          {discount > 0 && (
            <View className="absolute top-0 left-0 bg-green-600 rounded-tl-xl rounded-br-xl px-1 py-0.5">
              <Text className="text-white text-[8px] font-extrabold">{discount}%</Text>
            </View>
          )}
          {isOutOfStock && (
            <View className="absolute inset-0 bg-black/40 rounded-xl" />
          )}
        </View>
      )}

      <View className="flex-1">
        <Text
          className="text-slate-900 font-bold text-sm leading-tight"
          style={locale === 'te' ? { fontFamily: 'NotoSansTelugu_700Bold' } : undefined}
          numberOfLines={2}
        >
          {displayName}
        </Text>
        {item.weight ? (
          <Text className="text-slate-500 text-xs mt-0.5">{item.weight}</Text>
        ) : null}
        <View className="flex-row items-center gap-1.5 mt-1">
          <Text className="text-slate-900 font-bold text-sm">{rupees(item.price)}</Text>
          {item.mrp > item.price && (
            <Text className="text-slate-400 text-xs line-through">{rupees(item.mrp)}</Text>
          )}
        </View>
      </View>

      <View className="items-end gap-1 relative" style={{ width: 96 }}>
        {isOutOfStock ? (
          <TouchableOpacity
            onPress={onOutOfStockPress}
            className="bg-red-100 rounded-lg px-2 py-1 flex-row items-center gap-1"
          >
            <AlertCircle size={14} color="#dc2626" />
            <Text className="text-red-700 text-xs font-semibold">Out of stock</Text>
          </TouchableOpacity>
        ) : (
          <>
            <FullWidthStepper
              count={item.count}
              onAdd={() => addToCart(item.key)}
              onDec={() => decFromCart(item.key)}
            />
            <Text className="text-slate-500 text-[10px]">
              {rupees(item.price * item.count)}
            </Text>
          </>
        )}
      </View>
    </View>
  );
};
