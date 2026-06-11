// src/features/home/views/home/components/ProductCarouselRow.tsx

import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { ProductCarouselSection } from '../../../data/homeLayout.types';
import { DynamicProductCard } from './DynamicProductCard';

interface Props {
  section: ProductCarouselSection;
}

export const ProductCarouselRow = ({ section }: Props) => {
  if (!section.products.length) return null;

  return (
    <View className="pt-5">
      {!section.hideTitle && section.title ? (
        <Text className="text-slate-900 font-bold text-lg px-4 mb-3">{section.title}</Text>
      ) : null}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
      >
        {section.products.map((p) => (
          <DynamicProductCard key={p.id} product={p} />
        ))}
      </ScrollView>
    </View>
  );
};
