import { X } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Product } from '@/src/base/types/village.types';
import { useVillageStore } from '@/src/core/store';
import { interpolate } from '@/src/base/constants/translations';
import { rupees } from '@/src/features/home/data/static/villageData';
import { useTranslation } from '@/src/core/utils/useTranslation';
import { CompactStepper } from './CompactStepper';
import { VillageBottomSheet } from './VillageBottomSheet';

interface VariantBottomSheetProps {
  product: Product | null;
  onClose: () => void;
}

export const VariantBottomSheet = ({ product, onClose }: VariantBottomSheetProps) => {
  const { t } = useTranslation();
  const cart = useVillageStore(state => state.cart);
  const addToCart = useVillageStore(state => state.addToCart);
  const decFromCart = useVillageStore(state => state.decFromCart);

  return (
    <VillageBottomSheet visible={!!product} onClose={onClose}>
      {product && (
        <View className="pb-6">
          {/* Header */}
          <View className="flex-row items-center px-4 pb-3 border-b border-slate-100">
            <View className={`w-12 h-12 rounded-xl bg-gradient-to-br ${product.gradientFrom} ${product.gradientTo} items-center justify-center mr-3`}>
              <Text style={{ fontSize: 28 }}>{product.emoji}</Text>
            </View>
            <View className="flex-1">
              <Text className="text-slate-900 font-bold text-base" numberOfLines={1}>{product.name}</Text>
              <Text className="text-slate-500 text-xs mt-0.5">{t('choose_variant')}</Text>
            </View>
            <TouchableOpacity onPress={onClose} className="w-8 h-8 items-center justify-center">
              <X size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* Variant rows — no ScrollView here; VillageBottomSheet owns scrolling */}
          <View className="px-4 mt-3">
            {product.variants?.map((variant, i) => {
              const key = `${product.id}-v${i}`;
              const count = cart[key] ?? 0;
              const discount = variant.mrp > variant.price
                ? Math.round((1 - variant.price / variant.mrp) * 100)
                : 0;

              return (
                <View key={key} className="flex-row items-center py-3 border-b border-slate-50">
                  <View className="flex-1">
                    <Text className="text-slate-900 font-semibold text-sm">{variant.name}</Text>
                    <View className="flex-row items-center gap-2 mt-0.5">
                      <Text className="text-slate-900 font-bold text-sm">{rupees(variant.price)}</Text>
                      {variant.mrp > variant.price && (
                        <Text className="text-slate-400 text-xs line-through">{rupees(variant.mrp)}</Text>
                      )}
                      {discount > 0 && (
                        <Text className="text-green-600 text-xs font-semibold">{interpolate(t('discount_badge'), discount)}</Text>
                      )}
                    </View>
                  </View>
                  <View style={{ minWidth: 104 }}>
                    {count === 0 ? (
                      <TouchableOpacity
                        onPress={() => addToCart(key)}
                        className="border-2 border-green-600 rounded-lg h-9 px-4 items-center justify-center"
                      >
                        <Text className="text-green-700 font-bold text-sm">{t('add')}</Text>
                      </TouchableOpacity>
                    ) : (
                      <CompactStepper
                        count={count}
                        onAdd={() => addToCart(key)}
                        onDec={() => decFromCart(key)}
                      />
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}
    </VillageBottomSheet>
  );
};
