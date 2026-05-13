import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Category } from '@/src/base/types/village.types';

interface CategoryTileProps {
  category: Category;
  onPress: () => void;
}

export const CategoryTile = ({ category, onPress }: CategoryTileProps) => (
  <TouchableOpacity
    onPress={onPress}
    className="items-center gap-1.5 active:scale-95"
  >
    <View className={`w-14 h-14 rounded-2xl ${category.bgClass} items-center justify-center`}>
      <Text style={{ fontSize: 28 }}>{category.emoji}</Text>
    </View>
    <Text className="text-[10.5px] font-semibold text-slate-700 text-center">{category.name}</Text>
  </TouchableOpacity>
);
