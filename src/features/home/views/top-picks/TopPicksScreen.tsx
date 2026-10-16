import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Search, SlidersHorizontal, X } from 'lucide-react-native';
import { useGuardedRouter } from '@/src/shared/hooks/useGuardedRouter';
import { useBackAction } from '@/src/shared/hooks/useBackAction';
import {
  CartSummaryCard,
  ProductCard,
  SortBottomSheet,
  VariantBottomSheet,
} from '@/src/shared/components';
import { useTopPicksViewModel } from '@/src/features/home/viewmodel/top-picks/useTopPicksViewModel';
import { useTranslation } from '@/src/core/utils/useTranslation';
import { interpolate } from '@/src/base/constants/translations';
import { analytics } from '@/src/base/services/analytics';
import { useScreenFocused } from '@/src/shared/hooks/useScreenActive';

const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

export const TopPicksScreen = () => {
  const router = useGuardedRouter();
  const goBack = useBackAction(() => router.back('/(dashboard)/home'));
  const vm = useTopPicksViewModel();
  const focused = useScreenFocused();
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(390)).current;
  const { t, locale } = useTranslation();
  const lastViewedList = useRef(false);
  const visibleCards = useRef(new Map<string, { node: View; position: number }>());
  const seenImpressions = useRef(new Set<string>());
  const lastVisibilityCheck = useRef(0);
  const checkImpressions = () => {
    if (!focused) return;
    const now = Date.now();
    if (now - lastVisibilityCheck.current < 200) return;
    lastVisibilityCheck.current = now;
    const height = Dimensions.get('window').height;
    for (const [productId, { node, position }] of visibleCards.current) {
      const key = `${vm.searchQuery.trim()}:${vm.sortKey}:${position}:${productId}`;
      if (seenImpressions.current.has(key)) continue;
      node.measureInWindow((_x, y, _width, cardHeight) => {
        if (cardHeight <= 0 || Math.min(y + cardHeight, height) - Math.max(y, 0) < cardHeight * 0.5) return;
        if (seenImpressions.current.has(key)) return;
        seenImpressions.current.add(key);
        analytics.track('product_impression', { product_id: productId, list_id: 'top_picks', source: 'top_picks', position });
      });
    }
  };
  useEffect(() => {
    const timer = setTimeout(checkImpressions, 350);
    return () => clearTimeout(timer);
  }, [focused, vm.products, vm.sortKey, vm.searchQuery]);

  useEffect(() => {
    if (lastViewedList.current || vm.products.length === 0) return;
    lastViewedList.current = true;
    analytics.track('product_list_viewed', { list_id: 'top_picks', item_count: vm.products.length });
  }, [vm.products.length]);

  const changeSort = (key: typeof vm.sortKey) => {
    if (key !== vm.sortKey) analytics.track('product_sort_changed', { list_id: 'top_picks', sort_key: key });
    vm.setSortKey(key);
  };
  const lastSearch = useRef('');
  useEffect(() => {
    const query = vm.searchQuery.trim();
    if (!query) return;
    const timer = setTimeout(() => {
      if (lastSearch.current === query) return;
      lastSearch.current = query;
      analytics.track('search_performed', { query_length: query.length, result_count: vm.products.length, search_scope: 'top_picks' });
    }, 550);
    return () => clearTimeout(timer);
  }, [vm.searchQuery, vm.products.length]);

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
    const animation = Animated.timing(slideAnim, {
      toValue: 0,
      duration: 280,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [slideAnim]);

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
                onPress={goBack}
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
                <TouchableOpacity onPress={() => changeSort('popular')}>
                  <X size={12} color="#15803d" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </Animated.View>

      <AnimatedScrollView
        onScroll={checkImpressions}
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
                {vm.products.map((product, index) => (
                  <View
                    key={product.id}
                    ref={(node) => {
                      if (node) visibleCards.current.set(product.id, { node, position: index + 1 });
                      else visibleCards.current.delete(product.id);
                    }}
                    collapsable={false}
                    onLayout={checkImpressions}
                    style={{ width: '47.5%' }}
                  >
                    <ProductCard product={product} openVariants={vm.openVariants} context={{ source: 'top_picks', list_id: 'top_picks', position: index + 1 }} />
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      </AnimatedScrollView>

      {vm.cartCount > 0 && (
        <CartSummaryCard onPress={goToCart} />
      )}
      <SortBottomSheet
        visible={vm.sortSheetVisible}
        onClose={vm.closeSortSheet}
        sortKey={vm.sortKey}
        onSortChange={changeSort}
      />
      <VariantBottomSheet product={vm.variantProduct} context={vm.variantContext} onClose={vm.closeVariants} />
    </SafeAreaView>
  );
};
