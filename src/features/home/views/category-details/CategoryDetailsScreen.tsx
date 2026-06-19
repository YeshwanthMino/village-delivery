import { ArrowLeft, Search } from 'lucide-react-native';
import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, FlatList, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { FloatingCartPill } from '@/src/shared/components';
import { DynamicProductCard } from '../home/components/DynamicProductCard';
import { SubcategoryRail } from './components/SubcategoryRail';
import { useCategoryDetailsViewModel } from '../../viewmodel/categories/useCategoryDetailsViewModel';

export const CategoryDetailsScreen = () => {
  const router = useRouter();
  const vm = useCategoryDetailsViewModel();
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(390)).current;

  useEffect(() => {
    slideAnim.setValue(390);
    Animated.timing(slideAnim, { toValue: 0, duration: 280, useNativeDriver: true }).start();
  }, []);

  const headerTitle = vm.title || vm.selectedItem?.title || 'Category';

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['bottom', 'left', 'right']}>
      {/* Header */}
      <View className="bg-white border-b border-slate-100" style={{ paddingTop: insets.top + 12 }}>
        <View className="px-4 pb-3 flex-row items-center justify-between">
          <View className="flex-row items-center gap-2 flex-1">
            <TouchableOpacity onPress={() => router.back()} className="w-8 h-8 items-center justify-center">
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
            onPress={() => router.push('/search' as any)}
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
            <View className="flex-1 items-center justify-center px-6">
              <Text className="text-slate-500 text-sm text-center mb-4">{"Couldn't load products."}</Text>
              <TouchableOpacity onPress={() => vm.refetch()} className="bg-green-600 rounded-xl px-5 py-2.5">
                <Text className="text-white font-bold text-sm">Retry</Text>
              </TouchableOpacity>
            </View>
          ) : vm.products.length === 0 ? (
            <View className="flex-1 items-center justify-center px-6">
              <Text className="text-3xl mb-2">🧺</Text>
              <Text className="text-slate-500 text-sm text-center">No products in this category yet.</Text>
            </View>
          ) : (
            <FlatList
              data={vm.products}
              keyExtractor={(p) => p.id}
              numColumns={2}
              showsVerticalScrollIndicator={false}
              columnWrapperStyle={{ gap: 10, paddingHorizontal: 10 }}
              contentContainerStyle={{ paddingVertical: 10, gap: 10, paddingBottom: 96 }}
              renderItem={({ item }) => (
                <View style={{ flex: 1 }}>
                  <DynamicProductCard product={item} width="100%" />
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
        <FloatingCartPill count={vm.cartCount} onPress={() => router.push('/cart')} bottomOffset={0} />
      )}
    </SafeAreaView>
  );
};
