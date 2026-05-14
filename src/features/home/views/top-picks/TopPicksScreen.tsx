import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Search, SlidersHorizontal, X } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import {
  FloatingCartPill,
  ProductCard,
  SortBottomSheet,
  VariantBottomSheet,
} from '@/src/shared/components';
import { useTopPicksViewModel } from '@/src/features/home/viewmodel/top-picks/useTopPicksViewModel';
import { useTranslation } from '@/src/core/utils/useTranslation';
import { interpolate } from '@/src/base/constants/translations';

const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

export const TopPicksScreen = () => {
  const router = useRouter();
  const vm = useTopPicksViewModel();
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(390)).current;
  const { t, locale } = useTranslation();

  const TAB_BAR_CONTENT_HEIGHT = 64;
  const scrollPadding = TAB_BAR_CONTENT_HEIGHT + insets.bottom + 16;

  const sortLabels: Record<string, string> = {
    popular:    t('sort_popular'),
    price_asc:  t('sort_price_asc'),
    price_desc: t('sort_price_desc'),
    rating:     t('sort_rating'),
  };

  useEffect(() => {
    slideAnim.setValue(390);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 280,
      useNativeDriver: true,
    }).start();
  }, []);

  const goToCart = () => router.push('/cart');

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
              <View>
                <Text
                  className="text-slate-900 font-bold text-sm"
                  style={locale === 'te' ? { fontFamily: 'NotoSansTelugu_700Bold' } : undefined}
                >
                  {t('top_picks_title')}
                </Text>
                <Text className="text-slate-400 text-[10px]">
                  {interpolate(t('items_label'), vm.products.length)}
                </Text>
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
                <Text className="text-green-700 text-xs font-medium">{sortLabels[vm.sortKey]}</Text>
                <TouchableOpacity onPress={() => vm.setSortKey('popular')}>
                  <X size={12} color="#15803d" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </Animated.View>

      <AnimatedScrollView
        style={{ flex: 1, transform: [{ translateX: slideAnim }] }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: scrollPadding }}
        stickyHeaderIndices={[0]}
        decelerationRate="normal"
        scrollEventThrottle={16}
        nestedScrollEnabled={true}
        bounces={true}
        alwaysBounceVertical={true}
        overScrollMode="always"
        keyboardShouldPersistTaps="handled"
      >
        {/* [0] Search bar — sticky */}
        <View className="bg-white border-b border-slate-100 px-4 py-3">
          <View className="flex-row items-center bg-slate-100 rounded-xl px-3 h-11 gap-2">
            <Search size={16} color="#94a3b8" />
            <TextInput
              className="flex-1 text-slate-900 text-base"
              placeholder={t('search_top_picks_ph')}
              placeholderTextColor="#94a3b8"
              value={vm.searchQuery}
              onChangeText={vm.setSearchQuery}
              autoCorrect={false}
              returnKeyType="search"
              style={locale === 'te' ? { fontFamily: 'NotoSansTelugu_400Regular' } : undefined}
            />
            {vm.searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => vm.setSearchQuery('')}>
                <X size={16} color="#94a3b8" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* [1] Content */}
        <View className="bg-white">
          {vm.products.length === 0 ? (
            <View className="items-center justify-center py-20 px-8">
              <Text style={{ fontSize: 48 }}>🔍</Text>
              <Text
                className="text-slate-700 font-bold text-base mt-4 text-center"
                style={locale === 'te' ? { fontFamily: 'NotoSansTelugu_700Bold' } : undefined}
              >
                {t('top_picks_empty_title')}
              </Text>
              <Text
                className="text-slate-400 text-sm mt-2 text-center"
                style={locale === 'te' ? { fontFamily: 'NotoSansTelugu_400Regular' } : undefined}
              >
                {t('top_picks_empty_subtitle')}
              </Text>
            </View>
          ) : (
            <View className="px-4 pt-3 pb-8">
              <Text className="text-slate-500 text-xs mb-3">
                {interpolate(t('items_label'), vm.products.length)} · {sortLabels[vm.sortKey]}
              </Text>
              <View className="flex-row flex-wrap gap-3">
                {vm.products.map(product => (
                  <View key={product.id} style={{ width: '47.5%' }}>
                    <ProductCard product={product} openVariants={vm.openVariants} />
                  </View>
                ))}
              </View>
            </View>
          )}
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
