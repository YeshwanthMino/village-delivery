import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Heart, Search, SlidersHorizontal, X } from 'lucide-react-native';
import React, { useEffect, useRef } from 'react';
import { Animated, Text, TouchableOpacity, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { gradientColor } from '@/src/core/utils/gradientColors';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  FloatingCartPill,
  ProductCard,
  SortBottomSheet,
  VariantBottomSheet,
} from '@/src/shared/components';
import { useCategoryDetailsViewModel } from '../../viewmodel/categories/useCategoryDetailsViewModel';
import { useRouter } from 'expo-router';
import { useTranslation } from '@/src/core/utils/useTranslation';
import { interpolate } from '@/src/base/constants/translations';

const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

export const CategoryDetailsScreen = () => {
  const router = useRouter();
  const vm = useCategoryDetailsViewModel();
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(390)).current;
  const { t, locale } = useTranslation();
  const teFont = locale === 'te' ? { fontFamily: 'NotoSansTelugu_700Bold' } : undefined;
  const TAB_BAR_CONTENT_HEIGHT = 64;
  const scrollPadding = TAB_BAR_CONTENT_HEIGHT + insets.bottom + 16;

  const SORT_LABELS: Record<string, string> = {
    popular:    t('sort_popular'),
    price_asc:  t('sort_price_asc'),
    price_desc: t('sort_price_desc'),
    rating:     t('sort_rating'),
  };

  const FILTER_CHIPS = [
    t('filter_all'),
    t('filter_best_sellers'),
    t('filter_new'),
    t('filter_on_sale'),
    t('filter_top_rated'),
  ];

  useEffect(() => {
    slideAnim.setValue(390);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 280,
      useNativeDriver: true,
    }).start();
  }, []);

  const goToCart = () => router.push('/(dashboard)/cart');

  if (!vm.currentCategory) {
    return null;
  }

  const cat = vm.currentCategory;
  const grad = vm.heroGradient!;
  const catName = locale === 'te' ? cat.nameTE : cat.name;

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['bottom', 'left', 'right']}>
      {/* Sticky sub-header */}
      <Animated.View
        className="bg-white border-b border-slate-100"
        style={{ transform: [{ translateX: slideAnim }] }}
      >
        <View className="px-4 pb-3" style={{ paddingTop: insets.top + 12 }}>
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <TouchableOpacity
                onPress={() => router.back()}
                className="w-8 h-8 items-center justify-center mr-1"
              >
                <ArrowLeft size={20} color="#0f172a" />
              </TouchableOpacity>
              <View className={`w-8 h-8 rounded-lg ${cat.bgClass} items-center justify-center`}>
                <Text style={{ fontSize: 18 }}>{cat.emoji}</Text>
              </View>
              <View>
                <Text className="text-slate-900 font-bold text-sm">{catName}</Text>
                <Text className="text-slate-400 text-[10px]">{interpolate(t('items_label'), vm.products.length)}</Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={vm.openSortSheet}
              className="flex-row items-center gap-1.5 bg-slate-100 rounded-full px-3 py-1.5"
            >
              <SlidersHorizontal size={14} color="#64748b" />
              <Text className="text-slate-600 text-xs font-medium">{t('sort')}</Text>
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

      {/* Scrollable content */}
      <AnimatedScrollView
        style={{ flex: 1, transform: [{ translateX: slideAnim }] }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: scrollPadding }}
        stickyHeaderIndices={[1]}
        decelerationRate="normal"
        scrollEventThrottle={16}
        nestedScrollEnabled={true}
        bounces={true}
        alwaysBounceVertical={true}
        overScrollMode="always"
      >
        {/* [0] Full-bleed hero */}
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
            Category · {interpolate(t('items_label'), vm.products.length)}
          </Text>
          <Text className="text-white font-black mt-1" style={{ fontSize: 28 }}>{catName}</Text>
          <Text className="text-white/70 text-sm mt-1">{t('cat_tagline')}</Text>
          <Text style={{ fontSize: 64, marginTop: 8 }}>{cat.emoji}</Text>
        </LinearGradient>

        {/* [1] Chips row — sticky */}
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
            {FILTER_CHIPS.map((chip, i) => (
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
              {interpolate(t('items_label'), vm.products.length)} · {SORT_LABELS[vm.sortKey]}
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
      <SortBottomSheet
        visible={vm.sortSheetVisible}
        onClose={vm.closeSortSheet}
        sortKey={vm.sortKey}
        onSortChange={vm.setSortKey}
      />
      <VariantBottomSheet product={vm.variantProduct} onClose={vm.closeVariants} />
    </SafeAreaView>
  );
};
