import { useRouter } from 'expo-router';
import { Bell, Mic, Search } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { FloatingCartPill, VariantBottomSheet } from '@/src/shared/components';
import { useHomeViewModel } from '../../viewmodel/home/useHomeViewModel';
import { useHomeLayoutViewModel } from '../../viewmodel/home/useHomeLayoutViewModel';
import { HomeSections } from './components/HomeSections';
import { useTranslation } from '@/src/core/utils/useTranslation';
import { useVillageStore } from '@/src/core/store/useVillageStore';
import { HomeSkeleton } from './components/HomeSkeleton';
import { useAuthStore } from '@/src/core/store';

export const HomeScreen = () => {
  const router = useRouter();
  const vm = useHomeViewModel();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const locale = useVillageStore((s) => s.locale);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const layout = useHomeLayoutViewModel();
  const TAB_BAR_CONTENT_HEIGHT = 64;
  const scrollPadding = TAB_BAR_CONTENT_HEIGHT + insets.bottom + 16;

  const goToCart = () => router.push('/cart');

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['bottom', 'left', 'right']}>

      {/* ── Top Bar (placeholder, location to be rebuilt) ── */}
      <View className="bg-white px-4 pb-3 border-b border-slate-100" style={{ paddingTop: insets.top + 4 }}>
        {/* Row 1: placeholder header + bell */}
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-1">
            <Text className="text-slate-700 font-semibold text-sm">Delivery location</Text>
            <Text className="text-slate-900 font-bold text-base">Select location</Text>
          </View>

          <TouchableOpacity className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center">
            <Bell size={18} color="#475569" />
          </TouchableOpacity>
        </View>

        {/* Row 2: search bar + mic button */}
        <View className="flex-row items-center bg-slate-100 rounded-xl px-3 h-11 gap-2">
          <Search size={16} color="#94a3b8" />
          <TouchableOpacity
            activeOpacity={0.7}
            style={{ flex: 1 }}
            onPress={() => router.push('/search')}
          >
            <Text
              className="text-slate-400 text-base"
              style={locale === 'te' ? { fontFamily: 'NotoSansTelugu_400Regular' } : undefined}
            >
              {t('search_placeholder')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="w-8 h-8 bg-green-600 rounded-xl items-center justify-center"
            onPress={() => router.push('/search')}
          >
            <Mic size={15} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Home content */}
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: scrollPadding }}
        decelerationRate="normal"
        scrollEventThrottle={16}
        bounces={true}
        alwaysBounceVertical={true}
        overScrollMode="always"
      >
        {/* Dynamic home layout (driven by /app/page-layout/path/main) */}
        {layout.loading && layout.sections.length === 0 ? (
          <HomeSkeleton />
        ) : layout.error && layout.sections.length === 0 ? (
          <View className="py-16 items-center px-8">
            <Text className="text-slate-500 text-base text-center mb-4">{t('location_error_title')}</Text>
            <TouchableOpacity onPress={layout.refresh} className="bg-green-600 rounded-xl px-5 py-2.5">
              <Text className="text-white font-bold text-sm">{t('retry')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <HomeSections sections={layout.sections} />
        )}
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
