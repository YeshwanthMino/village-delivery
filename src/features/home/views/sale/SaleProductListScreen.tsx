import { Image } from 'expo-image';
import { ArrowLeft } from 'lucide-react-native';
import { useTranslation } from '@/src/core/utils/useTranslation';
import { LoadErrorState } from '@/src/shared/components/LoadErrorState';
import React from 'react';
import { ActivityIndicator, FlatList, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGuardedRouter } from '@/src/shared/hooks/useGuardedRouter';
import { useBackAction } from '@/src/shared/hooks/useBackAction';
import { CartSummaryCard } from '@/src/shared/components';
import { VariantBottomSheet } from '@/src/shared/components/VariantBottomSheet';
import { DynamicProductCard } from '../home/components/DynamicProductCard';
import { useSaleProductListViewModel } from '../../viewmodel/sale/useSaleProductListViewModel';
import { useVariantSheet } from '@/src/shared/hooks/useVariantSheet';
import { analytics } from '@/src/base/services/analytics';
import { useProductListImpressions } from '@/src/shared/hooks/useProductListImpressions';
import type { HomeProduct } from '../../data/homeLayout.types';

export const SaleProductListScreen = () => {
  const router = useGuardedRouter();
  const goBack = useBackAction(() => router.back('/(dashboard)/home'));
  const { t } = useTranslation();
  const vm = useSaleProductListViewModel();
  const insets = useSafeAreaInsets();
  const sheet = useVariantSheet();
  const listId = `sale:${vm.slug}`;
  const impressions = useProductListImpressions<HomeProduct>(listId, 'sale');
  const lastViewedSale = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (!vm.slug || vm.loading || vm.error || lastViewedSale.current === vm.slug) return;
    lastViewedSale.current = vm.slug;
    analytics.track('product_list_viewed', {
      list_id: `sale:${vm.slug}`,
      item_count: vm.products.length,
    });
  }, [vm.slug, vm.loading, vm.error, vm.products.length]);

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['bottom', 'left', 'right']}>
      <View className="bg-white border-b border-slate-100" style={{ paddingTop: insets.top + 12 }}>
        <View className="px-4 pb-3 flex-row items-center gap-2">
          <TouchableOpacity onPress={goBack} className="w-8 h-8 items-center justify-center">
            <ArrowLeft size={20} color="#0f172a" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-slate-900 font-bold text-base" numberOfLines={1}>
              {vm.title || 'Sale'}
            </Text>
            {vm.products.length > 0 ? (
              <Text className="text-slate-400 text-[11px]">{vm.products.length} items</Text>
            ) : null}
          </View>
        </View>
      </View>

      {vm.loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#16a34a" />
        </View>
      ) : vm.error ? (
        <LoadErrorState description={t('sale_load_failed_desc')} onRetry={() => vm.refetch()} />
      ) : vm.products.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-3xl mb-2">🏷️</Text>
          <Text className="text-slate-500 text-sm text-center">No products in this sale yet.</Text>
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
          ListHeaderComponent={
            vm.sale?.imageUrl ? (
              <View style={{ paddingHorizontal: 10 }}>
                <Image
                  source={{ uri: vm.sale.imageUrl }}
                  style={{ width: '100%', aspectRatio: 16 / 9, borderRadius: 16 }}
                  contentFit="cover"
                  transition={200}
                />
              </View>
            ) : null
          }
          renderItem={({ item, index }) => (
            <View style={{ flex: 1, maxWidth: '50%' }}>
              <DynamicProductCard product={item} width="100%" onOpenVariants={sheet.open} source="sale" listId={listId} position={index + 1} />
            </View>
          )}
        />
      )}

      {vm.cartCount > 0 && <CartSummaryCard onPress={() => router.push('/cart')} bottomOffset={0} />}

      <VariantBottomSheet product={sheet.product} context={sheet.context} onClose={sheet.close} />
    </SafeAreaView>
  );
};
