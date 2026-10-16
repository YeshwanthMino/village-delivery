// src/features/home/views/home/components/ProductCarouselRow.tsx

import React from 'react';
import { FlatList, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ProductCarouselSection } from '../../../data/homeLayout.types';
import { DynamicProductCard } from './DynamicProductCard';
import { Product } from '@/src/base/types/village.types';
import type { AnalyticsProductContext } from '@/src/base/services/analytics';
import { useProductRailImpressions } from '@/src/shared/hooks/useProductRailImpressions';
import type { HomeProduct } from '../../../data/homeLayout.types';

interface Props {
  section: ProductCarouselSection;
  onOpenVariants: (product: Product, context?: AnalyticsProductContext) => void;
  source?: 'home' | 'categories';
  registerImpressionCheck?: (check: () => void) => () => void;
}

// Matches the (dashboard) tab bar's own height formula in
// app/(dashboard)/_layout.tsx, so the stock-limit snackbar clears the
// floating tab bar rather than being hidden behind it. This row only ever
// renders on the home tab, inside (dashboard), so a tab bar is always present.
const TAB_BAR_CONTENT_HEIGHT = 64;

export const ProductCarouselRow = ({ section, onOpenVariants, source = 'home', registerImpressionCheck }: Props) => {
  const { bottom } = useSafeAreaInsets();
  const bottomOffset = TAB_BAR_CONTENT_HEIGHT + bottom;
  const impressions = useProductRailImpressions<HomeProduct>(section.id, source, registerImpressionCheck);

  if (!section.products.length) return null;

  return (
    <View className="pt-5">
      {!section.hideTitle && section.title ? (
        <Text className="text-slate-900 font-bold text-lg px-4 mb-3">{section.title}</Text>
      ) : null}

      <View ref={impressions.railRef} collapsable={false} onLayout={impressions.checkVisible}>
        <FlatList
          horizontal
          data={section.products}
          keyExtractor={(p) => p.id}
          onViewableItemsChanged={impressions.onViewableItemsChanged}
          viewabilityConfig={impressions.viewabilityConfig}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16 }}
          ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
          renderItem={({ item: p, index }) => (
          <DynamicProductCard
            product={p}
            onOpenVariants={onOpenVariants}
            bottomOffset={bottomOffset}
            source={source}
            listId={section.id}
            position={index + 1}
          />
          )}
        />
      </View>

    </View>
  );
};
