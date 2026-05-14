import { ChevronRight } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Category } from '@/src/base/types/village.types';
import { useTranslation } from '@/src/core/utils/useTranslation';
import { interpolate } from '@/src/base/constants/translations';

interface CategoryBigCardProps {
  category: Category;
  itemCount: number;
  onPress: () => void;
}

export const CategoryBigCard = ({ category, itemCount, onPress }: CategoryBigCardProps) => {
  const { t, locale } = useTranslation();
  const name = locale === 'te' ? category.nameTE : category.name;

  return (
    <TouchableOpacity
      onPress={onPress}
      className="bg-white border border-slate-100 rounded-2xl p-3 flex-row items-center gap-3 active:bg-slate-50"
    >
      <View className={`w-14 h-14 rounded-2xl ${category.bgClass} items-center justify-center`}>
        <Text style={{ fontSize: 28 }}>{category.emoji}</Text>
      </View>
      <View className="flex-1">
        <Text
          className="text-slate-900 font-bold text-sm"
          style={locale === 'te' ? { fontFamily: 'NotoSansTelugu_700Bold' } : undefined}
        >
          {name}
        </Text>
        <Text className="text-slate-500 text-xs mt-0.5">
          {interpolate(t('items_label'), itemCount)}
        </Text>
      </View>
      <ChevronRight size={18} color="#94a3b8" />
    </TouchableOpacity>
  );
};
