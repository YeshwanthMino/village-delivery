import React from 'react';
import { Text, View } from 'react-native';
import { CartLineItem } from '@/src/base/types/village.types';
import { rupees } from '@/src/features/home/data/static/villageData';
import { useVillageStore } from '@/src/core/store';
import { FullWidthStepper } from './FullWidthStepper';
import { useTranslation } from '@/src/core/utils/useTranslation';

interface CartItemRowProps {
  item: CartLineItem;
}

export const CartItemRow = ({ item }: CartItemRowProps) => {
  const addToCart = useVillageStore(state => state.addToCart);
  const decFromCart = useVillageStore(state => state.decFromCart);
  const { locale } = useTranslation();

  const displayName = locale === 'te' ? item.product.nameTE : item.product.name;

  const discount = item.mrp > item.price
    ? Math.round((1 - item.price / item.mrp) * 100)
    : 0;

  return (
    <View className="bg-white border border-slate-100 rounded-2xl p-2.5 flex-row items-center gap-3">
      <View className={`w-16 h-16 rounded-xl bg-gradient-to-br ${item.gradientFrom} ${item.gradientTo} items-center justify-center relative`}>
        <Text style={{ fontSize: 32 }}>{item.emoji}</Text>
        {discount > 0 && (
          <View className="absolute top-0 left-0 bg-green-600 rounded-tl-xl rounded-br-xl px-1 py-0.5">
            <Text className="text-white text-[8px] font-extrabold">{discount}%</Text>
          </View>
        )}
      </View>

      <View className="flex-1">
        <Text
          className="text-slate-900 font-bold text-sm leading-tight"
          style={locale === 'te' ? { fontFamily: 'NotoSansTelugu_700Bold' } : undefined}
          numberOfLines={2}
        >
          {displayName}
        </Text>
        <Text className="text-slate-500 text-xs mt-0.5">{item.weight}</Text>
        <View className="flex-row items-center gap-1.5 mt-1">
          <Text className="text-slate-900 font-bold text-sm">{rupees(item.price)}</Text>
          {item.mrp > item.price && (
            <Text className="text-slate-400 text-xs line-through">{rupees(item.mrp)}</Text>
          )}
        </View>
      </View>

      <View className="items-end gap-1" style={{ width: 96 }}>
        <FullWidthStepper
          count={item.count}
          onAdd={() => addToCart(item.key)}
          onDec={() => decFromCart(item.key)}
        />
        <Text className="text-slate-500 text-[10px]">
          {rupees(item.price * item.count)}
        </Text>
      </View>
    </View>
  );
};
