import { useFocusEffect, useRouter } from 'expo-router';
import { Search } from 'lucide-react-native';
import React from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { CartSummaryCard } from '@/src/shared/components';
import { useTranslation } from '@/src/core/utils/useTranslation';
import { useCategoriesViewModel } from '../../viewmodel/categories/useCategoriesViewModel';
import { useHomeLayoutViewModel } from '../../viewmodel/home/useHomeLayoutViewModel';
import { HomeSections } from '../home/components/HomeSections';
import { HomeSkeleton } from '../home/components/HomeSkeleton';

export const CategoriesScreen = () => {
  const router = useRouter();
  const { t } = useTranslation();
  const vm = useCategoriesViewModel();
  const layout = useHomeLayoutViewModel('app-category-page-layout');
  const insets = useSafeAreaInsets();

  const TAB_BAR_H = 64;
  const bottomPad = TAB_BAR_H + insets.bottom + 24;

  const [refreshing, setRefreshing] = React.useState(false);
  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try { await layout.refresh(); } finally { setRefreshing(false); }
  }, [layout.refresh]);

  // Tabs stay mounted, so refresh the layout on every focus after the first
  // (the first focus coincides with the mount-time load).
  const firstFocus = React.useRef(true);
  useFocusEffect(
    React.useCallback(() => {
      if (firstFocus.current) { firstFocus.current = false; return; }
      void layout.refresh();
    }, [layout.refresh]),
  );

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
          <View style={s.errorBox}>
            <Text style={s.errorText}>{t('location_error_title')}</Text>
            <TouchableOpacity onPress={layout.refresh} style={s.retryBtn}>
              <Text style={s.retryText}>{t('retry')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <HomeSections sections={layout.sections} />
        )}
      </ScrollView>

      {vm.cartCount > 0 && (
        <CartSummaryCard onPress={() => router.push('/cart')} />
      )}
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
  errorBox: { paddingVertical: 64, alignItems: 'center', paddingHorizontal: 32 },
  errorText: { color: '#64748b', fontSize: 16, textAlign: 'center', marginBottom: 16 },
  retryBtn: { backgroundColor: '#16a34a', borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10 },
  retryText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
