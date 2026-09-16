// src/features/home/views/home/components/CategoryGrid.tsx

import { Image } from 'expo-image';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { CategorySection, CategoryItem } from '../../../data/homeLayout.types';

interface Props {
  section: CategorySection;
  onPressItem: (item: CategoryItem, section: CategorySection) => void;
}

export const CategoryGrid = ({ section, onPressItem }: Props) => {
  if (!section.items.length) return null;

  return (
    <View className="px-4 pt-5">
      {!section.hideTitle && section.title ? (
        <Text className="text-slate-900 font-bold text-lg mb-3">{section.title}</Text>
      ) : null}

      <View className="flex-row flex-wrap">
        {section.items.map((item) => (
          <TouchableOpacity
            key={item.id}
            onPress={() => onPressItem(item, section)}
            activeOpacity={0.7}
            className="items-center mb-4"
            style={{ width: '25%' }}
          >
            <View
              className="bg-green-50 rounded-2xl items-center justify-center overflow-hidden"
              style={{ width: 64, height: 64 }}
            >
              <Image
                source={{ uri: item.imageUrl }}
                style={{ width: 64, height: 64 }}
                contentFit="cover"
                transition={150}
              />
            </View>
            <Text
              className="text-slate-700 text-xs font-medium text-center mt-1.5"
              numberOfLines={2}
              style={{ width: 76 }}
            >
              {item.title}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};
