import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Product } from '@/src/base/types/village.types';
import { useVillageStore } from '@/src/core/store';
import { rupees } from '@/src/features/home/data/static/villageData';

interface MiniProductCardProps {
  product: Product;
  openVariants: (product: Product) => void;
}

export const MiniProductCard = ({ product, openVariants }: MiniProductCardProps) => {
  const addToCart = useVillageStore(state => state.addToCart);

  const hasVariants = !!product.variants?.length;

  const handleAdd = () => {
    if (hasVariants) {
      openVariants(product);
    } else {
      addToCart(product.id);
    }
  };

  return (
    <View className="bg-white border border-slate-100 rounded-2xl overflow-hidden" style={{ width: 128 }}>
      {/* Gradient emoji area */}
      <View className={`h-20 bg-gradient-to-br ${product.gradientFrom} ${product.gradientTo} items-center justify-center`}>
        <Text style={{ fontSize: 44 }}>{product.emoji}</Text>
      </View>

      {/* Body */}
      <View className="p-2 gap-1">
        <Text className="text-[11px] font-bold text-slate-900 leading-tight" numberOfLines={2}>
          {product.name}
        </Text>
        <Text className="text-slate-500 text-[10px]">{product.weight}</Text>
        <Text className="text-slate-900 font-bold text-xs">{rupees(product.price)}</Text>

        <TouchableOpacity
          onPress={handleAdd}
          className="border border-green-600 rounded-md h-7 items-center justify-center mt-1"
        >
          <Text className="text-green-700 font-bold text-[10px] px-2">ADD</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
