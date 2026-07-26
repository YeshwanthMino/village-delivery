import { X } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View, Image } from 'react-native';
import { Product } from '@/src/base/types/village.types';
import { useVillageStore } from '@/src/core/store';
import { interpolate } from '@/src/base/constants/translations';
import { rupees } from '@/src/shared/utils/currency';
import { productSnapshot } from '@/src/features/cart/domain/bill';
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
          {/* Header with Image */}
          {product.image ? (
            <View className="px-4 pt-3 pb-3 border-b border-slate-100">
              <View className="flex-row items-start gap-3 mb-3">
                <Image
                  source={{ uri: product.image }}
                  style={{ width: 60, height: 60, borderRadius: 12, backgroundColor: '#f1f5f9' }}
                />
                <View className="flex-1">
                  <Text className="text-slate-900 font-bold text-base" numberOfLines={2}>{product.name}</Text>
                  <Text className="text-slate-500 text-xs mt-1">{t('choose_variant')}</Text>
                </View>
                <TouchableOpacity onPress={onClose} className="w-8 h-8 items-center justify-center">
                  <X size={20} color="#64748b" />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
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
          )}

          {/* Variant rows — no ScrollView here; VillageBottomSheet owns scrolling */}
          <View className="px-4 mt-3">
            {product.variants?.map((variant, i) => {
              const key = `${product.id}-v${i}`;
              const count = cart[key] ?? 0;
              const discount = variant.mrp > variant.price
                ? Math.round((1 - variant.price / variant.mrp) * 100)
                : 0;
              // Prices are in units regardless of source — the mappers convert at
              // the API boundary — so there is no per-source branch to make.
              const displayPrice = rupees(variant.price);
              const displayMrp = rupees(variant.mrp);

              const stock = variant.stock ?? 0;
              const canAdd = count < stock;
              return (
                <View key={key} className="flex-row items-center py-3 border-b border-slate-50">
                  <View className="flex-1">
                    <Text className="text-slate-900 font-semibold text-sm">{variant.name}</Text>
                    <View className="flex-row items-center gap-2 mt-0.5">
                      <Text className="text-slate-900 font-bold text-sm">{displayPrice}</Text>
                      {variant.mrp > variant.price && (
                        <Text className="text-slate-400 text-xs line-through">{displayMrp}</Text>
                      )}
                      {discount > 0 && (
                        <Text className="text-green-600 text-xs font-semibold">{interpolate(t('discount_badge'), discount)}</Text>
                      )}
                    </View>
                    {stock === 0 && (
                      <Text className="text-red-600 text-xs mt-1 font-semibold">{t('out_of_stock') || 'Out of Stock'}</Text>
                    )}
                  </View>
                  <View style={{ minWidth: 104 }}>
                    {stock === 0 ? (
                      <TouchableOpacity disabled className="border-2 border-slate-300 rounded-lg h-9 px-4 items-center justify-center opacity-50">
                        <Text className="text-slate-400 font-bold text-sm">{t('add')}</Text>
                      </TouchableOpacity>
                    ) : count === 0 ? (
                      <TouchableOpacity
                        onPress={() => addToCart(key, productSnapshot(product, i), stock)}
                        className="border-2 border-[#3D5FE8] rounded-lg h-9 px-4 items-center justify-center"
                      >
                        <Text className="text-[#3D5FE8] font-bold text-sm">{t('add')}</Text>
                      </TouchableOpacity>
                    ) : (
                      <CompactStepper
                        count={count}
                        maxQuantity={stock}
                        onAdd={() => addToCart(key, productSnapshot(product, i), stock)}
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
