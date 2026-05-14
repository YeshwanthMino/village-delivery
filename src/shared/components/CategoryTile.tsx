import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Category } from '@/src/base/types/village.types';
import { useTranslation } from '@/src/core/utils/useTranslation';
import { useVillageStore } from '@/src/core/store/useVillageStore';

interface CategoryTileProps {
  category: Category;
  onPress: () => void;
}

export const CategoryTile = ({ category, onPress }: CategoryTileProps) => {
  const { t } = useTranslation();
  const locale = useVillageStore((s) => s.locale);
  const label = t(`cat_${category.id}`);

  return (
    <TouchableOpacity
      onPress={onPress}
      className="items-center gap-1.5 active:scale-95"
      style={{ width: 72 }}
    >
      <View
        className={`rounded-2xl ${category.bgClass} items-center justify-center`}
        style={{ width: 72, height: 72 }}
      >
        <Text style={{ fontSize: 34 }}>{category.emoji}</Text>
      </View>
      <Text
        className="text-sm font-semibold text-slate-700 text-center"
        style={locale === 'te' ? { fontFamily: 'NotoSansTelugu_400Regular', fontSize: 12 } : undefined}
        numberOfLines={2}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
};
