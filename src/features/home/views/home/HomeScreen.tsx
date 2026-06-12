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
import { HomeSkeleton } from './components/HomeSkeleton';
import { useTranslation } from '@/src/core/utils/useTranslation';
import { useVillageStore } from '@/src/core/store/useVillageStore';
import { useLocationStore } from '@/src/core/store/useLocationStore';
import { LocationBar } from '@/src/features/location/views/components/LocationBar';
import { LocationPermissionSheet } from '@/src/features/location/views/LocationPermissionSheet';
import { LocationSheet } from '@/src/features/location/views/LocationSheet';

export const HomeScreen = () => {
  const router = useRouter();
  const vm = useHomeViewModel();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const locale = useVillageStore((s) => s.locale);
  const village = useLocationStore((s) => s.serviceableVillage);
  const status = useLocationStore((s) => s.status);
  const hydrated = useLocationStore((s) => s.hydrated);
  const layout = useHomeLayoutViewModel();

  const [permSheetOpen, setPermSheetOpen] = React.useState(false);
  const [changeSheetOpen, setChangeSheetOpen] = React.useState(false);

  const detecting = status === 'locating' || status === 'checking';
  const TAB_BAR_CONTENT_HEIGHT = 64;
  const scrollPadding = TAB_BAR_CONTENT_HEIGHT + insets.bottom + 16;

  // First open with no saved location → prompt for it (Zepto/Blinkit).
  React.useEffect(() => {
    if (hydrated && !village) setPermSheetOpen(true);
  }, [hydrated, village]);

  const goToCart = () => router.push('/cart');

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['bottom', 'left', 'right']}>

      {/* ── Top Bar ── */}
      <View className="bg-white px-4 pb-3 border-b border-slate-100" style={{ paddingTop: insets.top + 4 }}>
        <View className="flex-row items-center justify-between mb-3">
          <LocationBar
            village={village}
            detecting={detecting}
            onPress={() => (village ? setChangeSheetOpen(true) : setPermSheetOpen(true))}
          />
          <TouchableOpacity className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center">
            <Bell size={18} color="#475569" />
          </TouchableOpacity>
        </View>

        {/* Search bar + mic */}
        <View className="flex-row items-center bg-slate-100 rounded-xl px-3 h-11 gap-2">
          <Search size={16} color="#94a3b8" />
          <TouchableOpacity activeOpacity={0.7} style={{ flex: 1 }} onPress={() => router.push('/search')}>
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

      {/* Body */}
      {!village ? (
        // No location yet → loading gate (the permission sheet is open over this).
        <View className="flex-1 items-center justify-center px-8">
          <View className="w-16 h-16 rounded-full border-4 border-green-100 border-t-green-600 items-center justify-center">
            <Text className="text-2xl">📍</Text>
          </View>
          <Text className="text-slate-900 font-black text-base mt-5">{t('finding_location')}</Text>
          <Text className="text-slate-500 text-xs mt-1.5">{t('getting_ready')}</Text>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: scrollPadding }}
          decelerationRate="normal"
          scrollEventThrottle={16}
          bounces
          alwaysBounceVertical
          overScrollMode="always"
        >
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
      )}

      {/* Overlays */}
      {vm.cartCount > 0 && <FloatingCartPill count={vm.cartCount} onPress={goToCart} />}
      <VariantBottomSheet product={vm.variantProduct} onClose={vm.closeVariants} />

      <LocationPermissionSheet visible={permSheetOpen} onClose={() => setPermSheetOpen(false)} />
      <LocationSheet visible={changeSheetOpen} onClose={() => setChangeSheetOpen(false)} />
    </SafeAreaView>
  );
};
