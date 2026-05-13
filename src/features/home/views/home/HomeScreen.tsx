import { useRouter } from 'expo-router';
import { Bell, ChevronDown, MapPin, Search } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const insets = useSafeAreaInsets();

  const goToCategories = (catId?: string) => {
    if (catId) vm.setSelectedCat(catId);
    else vm.setSelectedCat(null);
    router.push('/(dashboard)/categories');
  };

  const goToCart = () => router.push('/(dashboard)/cart');

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['bottom', 'left', 'right']}>

      {/* ── Top Bar ── */}
      <View className="bg-white px-4 pb-3 border-b border-slate-100" style={{ paddingTop: insets.top + 4 }}>
        {/* Row 1: location + bell */}
        <View className="flex-row items-center justify-between mb-3">
          <TouchableOpacity className="flex-row items-center gap-1.5 flex-1 mr-3">
            <MapPin size={16} color="#16a34a" />
            <View className="flex-1">
              <View className="flex-row items-center gap-1">
                <Text className="text-slate-900 font-bold text-sm" numberOfLines={1}>
                  Home
                </Text>
                <ChevronDown size={14} color="#64748b" />
              </View>
              <Text className="text-slate-500 text-xs" numberOfLines={1}>
                221B Baker St, Mumbai · Delivery in 12 min
              </Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center">
            <Bell size={18} color="#475569" />
          </TouchableOpacity>
        </View>

        {/* Row 2: search bar */}
        <TouchableOpacity
          activeOpacity={0.7}
          className="flex-row items-center bg-slate-100 rounded-xl px-3 h-10 gap-2"
          onPress={() => router.navigate('/search')}
        >
          <Search size={16} color="#94a3b8" />
          <Text className="text-slate-400 text-sm flex-1">Search groceries, brands…</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 250 }}
        decelerationRate="normal"
        scrollEventThrottle={16}
        bounces={true}
        alwaysBounceVertical={true}
        overScrollMode="always"
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
          <View className="flex-row justify-between pb-4">
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
          <View className="flex-row flex-wrap gap-3 pb-4">
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
