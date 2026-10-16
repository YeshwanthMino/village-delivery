import { useGuardedRouter } from '@/src/shared/hooks/useGuardedRouter';
import { Search } from 'lucide-react-native';
import { LoadErrorState } from '@/src/shared/components/LoadErrorState';
import React from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { CartSummaryCard, VariantBottomSheet } from '@/src/shared/components';
import { useVariantSheet } from '@/src/shared/hooks/useVariantSheet';
import { useCategoriesViewModel } from '../../viewmodel/categories/useCategoriesViewModel';
import { useHomeLayoutViewModel } from '../../viewmodel/home/useHomeLayoutViewModel';
import { HomeSections } from '../home/components/HomeSections';
import { HomeSkeleton } from '../home/components/HomeSkeleton';
import { useImpressionViewportRegistry } from '@/src/shared/hooks/useImpressionViewportRegistry';

export const CategoriesScreen = () => {
  const router = useGuardedRouter();
  const vm = useCategoriesViewModel();
  const layout = useHomeLayoutViewModel('app-category-page-layout');
  const variantSheet = useVariantSheet();
  const impressionViewport = useImpressionViewportRegistry();
  const insets = useSafeAreaInsets();

  const TAB_BAR_H = 64;
  const bottomPad = TAB_BAR_H + insets.bottom + 24;

  const [refreshing, setRefreshing] = React.useState(false);
  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try { await layout.refresh(); } finally { setRefreshing(false); }
  }, [layout.refresh]);


  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }} edges={['bottom', 'left', 'right']}>
      {/* ── Sticky toolbar ── */}
      <View style={[s.toolbar, { paddingTop: insets.top + 10 }]}>
        <View style={s.toolbarSpacer} />
        <Text style={s.pageTitle}>All Categories</Text>
        <View style={s.toolbarIcons}>
          <TouchableOpacity
            style={s.iconBtn}
            onPress={() => router.push('/search')}
            activeOpacity={0.7}
          >
            <Search size={20} color="#1e293b" strokeWidth={2.2} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Scrollable content ── */}
      <ScrollView
        onScroll={impressionViewport.checkVisible}
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPad }}
        bounces
        alwaysBounceVertical
        overScrollMode="always"
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#16a34a" colors={['#16a34a']} />
        }
      >
        {layout.loading && layout.sections.length === 0 ? (
          <HomeSkeleton />
        ) : layout.error && layout.sections.length === 0 ? (
          <LoadErrorState className="py-12 items-center px-8" onRetry={layout.refresh} />
        ) : (
          <HomeSections sections={layout.sections} onOpenVariants={variantSheet.open} source="categories" registerImpressionCheck={impressionViewport.registerCheck} />
        )}
      </ScrollView>

      {vm.cartCount > 0 && (
        <CartSummaryCard onPress={() => router.push('/cart')} />
      )}
      <VariantBottomSheet product={variantSheet.product} context={variantSheet.context} onClose={variantSheet.close} />
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 4,
    zIndex: 10,
  },
  toolbarSpacer: { width: 88 },
  toolbarIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: 88,
    justifyContent: 'flex-end',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageTitle: {
    fontSize: 20,
    fontFamily: 'EuclidCircularA-Bold',
    color: '#0f172a',
    letterSpacing: -0.3,
    flex: 1,
    textAlign: 'center',
  },
});
