import { Image } from 'expo-image';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { AlertCircle, Trash2 } from 'lucide-react-native';
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

  const handleRemoveItem = () => {
    console.log('[CartItemRow] === REMOVE BUTTON PRESSED ===');
    console.log('[CartItemRow] Item details:', { key: item.key, productId: item.productId, name: item.name, quantity: item.count });

    // Remove entire quantity - call decFromCart for each unit
    for (let i = 0; i < item.count; i++) {
      console.log(`[CartItemRow] Calling decFromCart (${i + 1}/${item.count})`, item.key);
      decFromCart(item.key);
    }

    console.log('[CartItemRow] === ITEM REMOVAL COMPLETED ===');
  };

  const displayName = locale === 'te' && item.nameTE ? item.nameTE : item.name;

  const discount = item.mrp > item.price
    ? Math.round((1 - item.price / item.mrp) * 100)
    : 0;

  const isOutOfStock = stockStatus && !stockStatus.inStock;

  React.useEffect(() => {
    if (isOutOfStock) {
      console.log('[CartItemRow] Item out of stock detected:', { key: item.key, productId: item.productId, name: item.name });
    }
  }, [isOutOfStock, item.key, item.productId, item.name]);

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
          <View className="gap-1 w-full">
            <TouchableOpacity
              onPress={onOutOfStockPress}
              testID="out-of-stock-badge"
              className="bg-red-100 rounded-lg px-2 py-1 flex-row items-center gap-1 justify-center"
            >
              <AlertCircle size={14} color="#dc2626" />
              <Text className="text-red-700 text-xs font-semibold">Out of stock</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleRemoveItem}
              className="bg-red-50 rounded-lg px-2 py-1 flex-row items-center justify-center border border-red-200"
            >
              <Trash2 size={12} color="#dc2626" />
              <Text className="text-red-600 text-xs font-semibold ml-1">Remove</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <FullWidthStepper
              count={item.count}
              maxQuantity={stockStatus?.availableQuantity}
              onAdd={() => addToCart(item.key, undefined, stockStatus?.availableQuantity)}
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
