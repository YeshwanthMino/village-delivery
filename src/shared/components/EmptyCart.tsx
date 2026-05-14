import { ShoppingBag } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from '@/src/core/utils/useTranslation';

interface EmptyCartProps {
  onStartShopping: () => void;
}

export const EmptyCart = ({ onStartShopping }: EmptyCartProps) => {
  const { t } = useTranslation();
  return (
    <View className="flex-1 items-center justify-center px-6 py-12">
      <View className="w-28 h-28 bg-green-50 rounded-full items-center justify-center mb-5 relative">
        <ShoppingBag size={52} color="#16a34a" />
        <Text className="absolute bottom-1 right-1 text-xl">🥦</Text>
      </View>
      <Text className="text-slate-900 font-bold text-xl mb-2">{t('cart_empty_title')}</Text>
      <Text className="text-slate-500 text-sm text-center mb-6">{t('cart_empty_subtitle')}</Text>
      <TouchableOpacity
        onPress={onStartShopping}
        className="bg-green-600 rounded-2xl px-8 py-3"
      >
        <Text className="text-white font-bold text-sm">{t('start_shopping')}</Text>
      </TouchableOpacity>
    </View>
  );
};
