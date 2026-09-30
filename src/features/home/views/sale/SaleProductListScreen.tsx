import { Image } from 'expo-image';
import { ArrowLeft } from 'lucide-react-native';
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

export const SaleProductListScreen = () => {
  const router = useGuardedRouter();
  const goBack = useBackAction(() => router.back('/(dashboard)/home'));
  const vm = useSaleProductListViewModel();
  const insets = useSafeAreaInsets();
  const sheet = useVariantSheet();

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
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-slate-500 text-sm text-center mb-4">{"Couldn't load this sale."}</Text>
          {vm.slug ? (
            <TouchableOpacity onPress={() => vm.refetch()} className="bg-green-600 rounded-xl px-5 py-2.5">
              <Text className="text-white font-bold text-sm">Retry</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : vm.products.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-3xl mb-2">🏷️</Text>
          <Text className="text-slate-500 text-sm text-center">No products in this sale yet.</Text>
        </View>
      ) : (
        <FlatList
          data={vm.products}
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
          renderItem={({ item }) => (
            <View style={{ flex: 1, maxWidth: '50%' }}>
              <DynamicProductCard product={item} width="100%" onOpenVariants={sheet.open} />
            </View>
          )}
        />
      )}

      {vm.cartCount > 0 && <CartSummaryCard onPress={() => router.push('/cart')} bottomOffset={0} />}

      <VariantBottomSheet product={sheet.product} onClose={sheet.close} />
    </SafeAreaView>
  );
};
