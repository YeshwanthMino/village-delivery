// src/features/home/views/home/components/ProductCarouselRow.tsx

import React from 'react';
import { ScrollView, Text, View, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ProductCarouselSection } from '../../../data/homeLayout.types';
import { DynamicProductCard } from './DynamicProductCard';
import { VariantBottomSheet } from '@/src/shared/components/VariantBottomSheet';
import { useVariantSheet } from '@/src/shared/hooks/useVariantSheet';

interface Props {
  section: ProductCarouselSection;
}

// Matches the (dashboard) tab bar's own height formula in
// app/(dashboard)/_layout.tsx, so the stock-limit snackbar clears the
// floating tab bar rather than being hidden behind it. This row only ever
// renders on the home tab, inside (dashboard), so a tab bar is always present.
const TAB_BAR_CONTENT_HEIGHT = 64;

export const ProductCarouselRow = ({ section }: Props) => {
  const { product, open, close } = useVariantSheet();
  const { bottom } = useSafeAreaInsets();
  const bottomOffset = TAB_BAR_CONTENT_HEIGHT + bottom;

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
          <DynamicProductCard
            key={p.id}
            product={p}
            onOpenVariants={open}
            bottomOffset={bottomOffset}
          />
        ))}
      </ScrollView>

      <VariantBottomSheet
        product={product}
        onClose={close}
      />
    </View>
  );
};
