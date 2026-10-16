import { ArrowLeft, Search } from 'lucide-react-native';
import { useTranslation } from '@/src/core/utils/useTranslation';
import { LoadErrorState } from '@/src/shared/components/LoadErrorState';
import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, FlatList, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGuardedRouter } from '@/src/shared/hooks/useGuardedRouter';
import { useBackAction } from '@/src/shared/hooks/useBackAction';
import { CartSummaryCard } from '@/src/shared/components';
import { VariantBottomSheet } from '@/src/shared/components/VariantBottomSheet';
import { DynamicProductCard } from '../home/components/DynamicProductCard';
import { SubcategoryRail } from './components/SubcategoryRail';
import { useCategoryDetailsViewModel } from '../../viewmodel/categories/useCategoryDetailsViewModel';
import { useVariantSheet } from '@/src/shared/hooks/useVariantSheet';
import { analytics } from '@/src/base/services/analytics';
import { useProductListImpressions } from '@/src/shared/hooks/useProductListImpressions';
import type { HomeProduct } from '../../data/homeLayout.types';

export const CategoryDetailsScreen = () => {
  const router = useGuardedRouter();
  const goBack = useBackAction(() => router.back('/(dashboard)/categories'));
  const { t } = useTranslation();
  const vm = useCategoryDetailsViewModel();
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(390)).current;
  const sheet = useVariantSheet();
  const listId = vm.selectedId ? `category:${vm.selectedId}` : '';
  const impressions = useProductListImpressions<HomeProduct>(listId, 'category');
  const lastViewedCategory = useRef<string | null>(null);
  const lastViewedList = useRef<string | null>(null);

  useEffect(() => {
    if (!vm.selectedId || lastViewedCategory.current === vm.selectedId) return;
    lastViewedCategory.current = vm.selectedId;
    analytics.track('category_viewed', { category_id: vm.selectedId });
  }, [vm.selectedId]);

  useEffect(() => {
    if (!vm.selectedId || vm.loading || vm.error || lastViewedList.current === vm.selectedId) return;
    lastViewedList.current = vm.selectedId;
    analytics.track('product_list_viewed', {
      list_id: `category:${vm.selectedId}`,
      category_id: vm.selectedId,
      item_count: vm.products.length,
    });
  }, [vm.selectedId, vm.loading, vm.error, vm.products.length]);

  useEffect(() => {
    slideAnim.setValue(390);
    const animation = Animated.timing(slideAnim, { toValue: 0, duration: 280, useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [slideAnim]);

  const headerTitle = vm.title || vm.selectedItem?.title || 'Category';

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['bottom', 'left', 'right']}>
      {/* Header */}
      <View className="bg-white border-b border-slate-100" style={{ paddingTop: insets.top + 12 }}>
        <View className="px-4 pb-3 flex-row items-center justify-between">
          <View className="flex-row items-center gap-2 flex-1">
            <TouchableOpacity onPress={goBack} className="w-8 h-8 items-center justify-center">
              <ArrowLeft size={20} color="#0f172a" />
            </TouchableOpacity>
            <View className="flex-1">
              <Text className="text-slate-900 font-bold text-base" numberOfLines={1}>
                {headerTitle}
              </Text>
              {vm.total > 0 ? (
                <Text className="text-slate-400 text-[11px]">{vm.total} items</Text>
              ) : null}
            </View>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/search')}
            className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center"
          >
            <Search size={18} color="#334155" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Two-pane body */}
      <Animated.View style={{ flex: 1, flexDirection: 'row', transform: [{ translateX: slideAnim }] }}>
        <SubcategoryRail items={vm.railItems} selectedId={vm.selectedId} onSelect={vm.select} />

        <View style={{ flex: 1 }}>
          {vm.loading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator color="#16a34a" />
            </View>
          ) : vm.error ? (
            <LoadErrorState description={t('products_load_failed_desc')} onRetry={() => vm.refetch()} />
          ) : vm.products.length === 0 ? (
            <View className="flex-1 items-center justify-center px-6">
              <Text className="text-3xl mb-2">🧺</Text>
              <Text className="text-slate-500 text-sm text-center">No products in this category yet.</Text>
            </View>
          ) : (
            <FlatList
              data={vm.products}
              onViewableItemsChanged={impressions.onViewableItemsChanged}
              viewabilityConfig={impressions.viewabilityConfig}
              keyExtractor={(p) => p.id}
              numColumns={2}
              showsVerticalScrollIndicator={false}
              columnWrapperStyle={{ gap: 10, paddingHorizontal: 10, justifyContent: 'flex-start' }}
              contentContainerStyle={{ paddingVertical: 10, gap: 10, paddingBottom: 96 }}
              renderItem={({ item, index }) => (
                <View style={{ flex: 1, maxWidth: '50%' }}>
                  <DynamicProductCard
                    product={item}
                    width="100%"
                    onOpenVariants={sheet.open}
                    source="category"
                    listId={listId}
                    position={index + 1}
                  />
                </View>
              )}
              ListFooterComponent={
                vm.hasMore ? (
                  <View className="px-10 pt-3">
                    <TouchableOpacity
                      onPress={vm.loadMore}
                      disabled={vm.loadingMore}
                      className="border border-green-600 rounded-xl py-2.5 items-center"
                    >
                      {vm.loadingMore ? (
                        <ActivityIndicator color="#16a34a" />
                      ) : (
                        <Text className="text-green-700 font-bold text-sm">Load more</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                ) : null
              }
            />
          )}
        </View>
      </Animated.View>

      {vm.cartCount > 0 && (
        <CartSummaryCard onPress={() => router.push('/cart')} bottomOffset={0} />
      )}

      <VariantBottomSheet
        product={sheet.product}
        context={sheet.context}
        onClose={sheet.close}
      />
    </SafeAreaView>
  );
};
