// src/features/product/views/components/ProductCartBar.tsx

import { Minus, Plus } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from '@/src/core/utils/useTranslation';

interface Props {
  count: number;
  inStock?: boolean;
  onAdd: () => void;
  onDec: () => void;
  onViewCart: () => void;
}

export const ProductCartBar = ({ count, inStock = true, onAdd, onDec, onViewCart }: Props) => {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  if (!inStock) {
    return (
      <View
        className="bg-white border-t border-slate-100 px-4 pt-3"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        <View className="bg-slate-100 rounded-2xl h-14 items-center justify-center">
          <Text className="text-slate-400 font-extrabold text-base">Out of Stock</Text>
        </View>
      </View>
    );
  }

  return (
    <View
      className="bg-white border-t border-slate-100 px-4 pt-3"
      style={{ paddingBottom: insets.bottom + 12 }}
    >
      {count === 0 ? (
        <TouchableOpacity
          onPress={onAdd}
          className="bg-green-600 rounded-2xl h-14 items-center justify-center"
        >
          <Text className="text-white font-extrabold text-base">{t('add_to_cart')}</Text>
        </TouchableOpacity>
      ) : (
        <View className="flex-row items-center gap-3">
          <View className="flex-row items-center justify-between bg-green-600 rounded-2xl px-4 h-14 flex-1">
            <TouchableOpacity onPress={onDec} hitSlop={8}>
              <Minus size={20} color="#ffffff" />
            </TouchableOpacity>
            <Text className="text-white font-extrabold text-base">{count}</Text>
            <TouchableOpacity onPress={onAdd} hitSlop={8}>
              <Plus size={20} color="#ffffff" />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            onPress={onViewCart}
            className="border-2 border-green-600 rounded-2xl h-14 px-5 items-center justify-center flex-1"
          >
            <Text className="text-green-700 font-extrabold text-base">{t('view_cart')}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};
