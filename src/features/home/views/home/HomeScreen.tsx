import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  CategoryTile,
  FloatingCartPill,
  HeroCarousel,
  ProductCard,
  PromoStrip,
  VariantBottomSheet,
} from '@/src/shared/components';
import { useHomeViewModel } from '../../viewmodel/home/useHomeViewModel';

export const HomeScreen = () => {
  const router = useRouter();
  const vm = useHomeViewModel();

  const goToCategories = (catId?: string) => {
    if (catId) vm.setSelectedCat(catId);
    else vm.setSelectedCat(null);
    router.push('/(dashboard)/categories');
  };

  const goToCart = () => router.push('/(dashboard)/cart');

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Hero Carousel */}
        <HeroCarousel
          slides={vm.heroSlides}
          onShopNow={() => goToCategories()}
        />

        {/* Shop by category */}
        <View className="px-4 mt-5">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-slate-900 font-bold text-base">Shop by category</Text>
            <TouchableOpacity onPress={() => goToCategories()}>
              <Text className="text-green-600 font-semibold text-sm">See all</Text>
            </TouchableOpacity>
          </View>

          {/* 5-col grid — two rows of 5 */}
          <View className="flex-row justify-between mb-3">
            {vm.categories.slice(0, 5).map(cat => (
              <CategoryTile
                key={cat.id}
                category={cat}
                onPress={() => goToCategories(cat.id)}
              />
            ))}
          </View>
          <View className="flex-row justify-between">
            {vm.categories.slice(5, 10).map(cat => (
              <CategoryTile
                key={cat.id}
                category={cat}
                onPress={() => goToCategories(cat.id)}
              />
            ))}
          </View>
        </View>

        {/* Promo strip */}
        <View className="px-4 mt-4">
          <PromoStrip />
        </View>

        {/* Top picks */}
        <View className="px-4 mt-5">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-slate-900 font-bold text-base">Top picks for you</Text>
            <TouchableOpacity onPress={() => goToCategories()}>
              <Text className="text-green-600 font-semibold text-sm">See all</Text>
            </TouchableOpacity>
          </View>

          {/* 2-col product grid */}
          <View className="flex-row flex-wrap gap-3">
            {vm.topPicks.map(product => (
              <View key={product.id} style={{ width: '47.5%' }}>
                <ProductCard
                  product={product}
                  openVariants={vm.openVariants}
                />
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Overlays */}
      {vm.cartCount > 0 && (
        <FloatingCartPill count={vm.cartCount} onPress={goToCart} />
      )}
      <VariantBottomSheet
        product={vm.variantProduct}
        onClose={vm.closeVariants}
      />
    </SafeAreaView>
  );
};
