import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Heart, Search, SlidersHorizontal, X } from 'lucide-react-native';
import React, { useEffect, useRef } from 'react';
import { Animated, Text, TouchableOpacity, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';

const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);
import { gradientColor } from '@/src/core/utils/gradientColors';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CategoryBigCard,
  FloatingCartPill,
  ProductCard,
  SortBottomSheet,
  VariantBottomSheet,
} from '@/src/shared/components';
import { useCategoriesViewModel } from '../../viewmodel/categories/useCategoriesViewModel';
import { useRouter } from 'expo-router';

const SORT_LABELS: Record<string, string> = {
  popular:    'Most Popular',
  price_asc:  'Price: Low to High',
  price_desc: 'Price: High to Low',
  rating:     'Top Rated',
};

export const CategoriesScreen = () => {
  const router = useRouter();
  const vm = useCategoriesViewModel();
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(390)).current;

  // Slide-in animation when category selected
  useEffect(() => {
    if (vm.selectedCat) {
      slideAnim.setValue(390);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 280,
        useNativeDriver: true,
      }).start();
    }
  }, [vm.selectedCat]);

  const goToCart = () => router.push('/(dashboard)/cart');

  // Browse state (no category selected)
  if (!vm.selectedCat) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50" edges={['bottom', 'left', 'right']}>
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
          {/* Header */}
          <View className="px-4 pb-2" style={{ paddingTop: insets.top + 16 }}>
            <Text className="text-slate-900 font-black text-2xl">Groceries</Text>
            <Text className="text-slate-500 text-sm mt-1">
              {vm.categories.length * 6} products across {vm.categories.length} categories
            </Text>
          </View>

          {/* 2-col category grid */}
          <View className="px-4 gap-3 pb-4">
            {/* Pair categories into rows of 2 */}
            {Array.from({ length: Math.ceil(vm.categories.length / 2) }, (_, rowIdx) => (
              <View key={rowIdx} className="flex-row gap-3">
                {vm.categories.slice(rowIdx * 2, rowIdx * 2 + 2).map(cat => (
                  <View key={cat.id} className="flex-1">
                    <CategoryBigCard
                      category={cat}
                      itemCount={vm.productCountInCat(cat.id)}
                      onPress={() => vm.setSelectedCat(cat.id)}
                    />
                  </View>
                ))}
              </View>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Detail state (category selected)
  const cat = vm.currentCategory!;
  const grad = vm.heroGradient!;

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['bottom', 'left', 'right']}>
      {/* Sticky sub-header — outside scroll, same pattern as HomeScreen */}
      <Animated.View
        className="bg-white border-b border-slate-100"
        style={{ transform: [{ translateX: slideAnim }] }}
      >
        <View className="px-4 pb-3" style={{ paddingTop: insets.top + 12 }}>
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <TouchableOpacity
                onPress={() => vm.setSelectedCat(null)}
                className="w-8 h-8 items-center justify-center mr-1"
              >
                <ArrowLeft size={20} color="#0f172a" />
              </TouchableOpacity>
              <View className={`w-8 h-8 rounded-lg ${cat.bgClass} items-center justify-center`}>
                <Text style={{ fontSize: 18 }}>{cat.emoji}</Text>
              </View>
              <View>
                <Text className="text-slate-900 font-bold text-sm">{cat.name}</Text>
                <Text className="text-slate-400 text-[10px]">{vm.products.length} products</Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={vm.openSortSheet}
              className="flex-row items-center gap-1.5 bg-slate-100 rounded-full px-3 py-1.5"
            >
              <SlidersHorizontal size={14} color="#64748b" />
              <Text className="text-slate-600 text-xs font-medium">Sort</Text>
            </TouchableOpacity>
          </View>

          {vm.sortKey !== 'popular' && (
            <View className="flex-row items-center gap-1.5 mt-2">
              <View className="flex-row items-center gap-1 bg-green-50 border border-green-200 rounded-full px-3 py-1">
                <Text className="text-green-700 text-xs font-medium">{SORT_LABELS[vm.sortKey]}</Text>
                <TouchableOpacity onPress={() => vm.setSortKey('popular')}>
                  <X size={12} color="#15803d" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </Animated.View>

      {/* Scrollable content — chips at index 1 become sticky via stickyHeaderIndices */}
      <AnimatedScrollView
        style={{ flex: 1, transform: [{ translateX: slideAnim }] }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 250 }}
        stickyHeaderIndices={[1]}
        decelerationRate="normal"
        scrollEventThrottle={16}
        nestedScrollEnabled={true}
        bounces={true}
        alwaysBounceVertical={true}
        overScrollMode="always"
      >
        {/* [0] Full-bleed hero — scrolls away */}
        <LinearGradient
          colors={[gradientColor(grad.from), gradientColor(grad.to)]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ minHeight: 180, paddingTop: 20, paddingBottom: 40, paddingHorizontal: 16 }}
        >
          <View className="flex-row gap-2 justify-end mb-2">
            <TouchableOpacity
              className="w-10 h-10 bg-white/20 rounded-full items-center justify-center"
              onPress={() =>
                router.push(
                  `/search?categoryId=${cat.id}&categoryName=${encodeURIComponent(cat.name)}`
                )
              }
            >
              <Search size={18} color="white" />
            </TouchableOpacity>
            <TouchableOpacity className="w-10 h-10 bg-white/20 rounded-full items-center justify-center">
              <Heart size={18} color="white" />
            </TouchableOpacity>
          </View>
          <Text className="text-white/70 text-xs font-semibold tracking-wider uppercase">
            Category · {vm.products.length} products
          </Text>
          <Text className="text-white font-black mt-1" style={{ fontSize: 28 }}>{cat.name}</Text>
          <Text className="text-white/70 text-sm mt-1">Fresh · Quality · Delivered in 12 min</Text>
          <Text style={{ fontSize: 64, marginTop: 8 }}>{cat.emoji}</Text>
        </LinearGradient>

        {/* [1] Chips row — sticks below toolbar when hero scrolls past */}
        <View className="bg-white border-b border-slate-100">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ paddingHorizontal: 16, paddingVertical: 10 }}
            contentContainerStyle={{ gap: 8 }}
            directionalLockEnabled={true}
            nestedScrollEnabled={true}
            decelerationRate="normal"
          >
            {['All', 'Best sellers', 'New', 'On sale', 'Top rated'].map((chip, i) => (
              <View
                key={chip}
                className={`rounded-full px-4 py-1.5 border ${
                  i === 0 ? 'bg-green-600 border-green-600' : 'bg-white border-slate-200'
                }`}
              >
                <Text className={`text-xs font-semibold ${i === 0 ? 'text-white' : 'text-slate-600'}`}>
                  {chip}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* [2] Products */}
        <View className="bg-white">
          <View className="px-4 pt-3 pb-2">
            <Text className="text-slate-500 text-xs">
              Showing {vm.products.length} · {SORT_LABELS[vm.sortKey]}
            </Text>
          </View>
          <View className="px-4 pb-8">
            <View className="flex-row flex-wrap gap-3">
              {vm.products.map(product => (
                <View key={product.id} style={{ width: '47.5%' }}>
                  <ProductCard product={product} openVariants={vm.openVariants} />
                </View>
              ))}
            </View>
          </View>
        </View>
      </AnimatedScrollView>

      {vm.cartCount > 0 && (
        <FloatingCartPill count={vm.cartCount} onPress={goToCart} />
      )}
      <SortBottomSheet visible={vm.sortSheetVisible} onClose={vm.closeSortSheet} />
      <VariantBottomSheet product={vm.variantProduct} onClose={vm.closeVariants} />
    </SafeAreaView>
  );
};
