import { useRouter, useFocusEffect } from 'expo-router';
import { Bell, Mic, Search, ShoppingCart } from 'lucide-react-native';
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
import { NotServiceableView } from '@/src/features/location/views/components/NotServiceableView';
import { LocationService } from '@/src/features/location/data/LocationService';
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
  const detectCurrentLocation = useLocationStore((s) => s.detectCurrentLocation);

  const [permSheetOpen, setPermSheetOpen] = React.useState(false);
  const [changeSheetOpen, setChangeSheetOpen] = React.useState(false);
  // Auto-GPS-detect fires at most once per session. Re-focusing must NOT re-fire
  // it — that re-shows the OS "Location Accuracy" dialog every time. After the
  // first attempt the permission sheet handles manual retry.
  const autoDetectedRef = React.useRef(false);

  const detecting = status === 'locating' || status === 'checking';

  // Once a location resolves (auto-detect, recent, or search), close any open
  // location sheet — the home feed takes over.
  React.useEffect(() => {
    if (village) {
      setPermSheetOpen(false);
      setChangeSheetOpen(false);
    }
  }, [village]);
  const TAB_BAR_CONTENT_HEIGHT = 64;
  const scrollPadding = TAB_BAR_CONTENT_HEIGHT + insets.bottom + 16;

  // Location bootstrap (Zepto/Blinkit). With no saved village:
  //   • permission already granted → auto-detect (GPS → find-by-location), no sheet
  //   • permission not granted     → prompt with the permission sheet
  // not_serviceable → close the sheet so the full-screen NotServiceableView shows.
  //
  // Runs on every screen focus (not just mount): Home is a tab that stays mounted,
  // so a round-trip to /location and back wouldn't otherwise re-evaluate. Without
  // this, a dismissed sheet + no village leaves a bare "finding location" gate.
  useFocusEffect(
    React.useCallback(() => {
      if (!hydrated || village) return;
      if (status === 'not_serviceable') {
        setPermSheetOpen(false);
        return;
      }
      if (status === 'error') {
        setPermSheetOpen(true);
        return;
      }
      if (status !== 'idle') return; // already locating/checking

      let cancelled = false;
      void (async () => {
        const perm = await LocationService.getPermissionState();
        if (cancelled) return;
        // Auto-detect only on the first attempt; afterwards show the sheet so the
        // user retries manually (avoids re-prompting the OS location dialog).
        if (perm === 'granted' && !autoDetectedRef.current) {
          autoDetectedRef.current = true;
          void detectCurrentLocation();
        } else {
          setPermSheetOpen(true);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [hydrated, village, status, detectCurrentLocation]),
  );

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
          <View className="flex-row items-center gap-2">
            <TouchableOpacity
              onPress={goToCart}
              className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center relative"
            >
              <ShoppingCart size={18} color="#475569" />
              {vm.cartCount > 0 && (
                <View className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-green-600 items-center justify-center">
                  <Text className="text-white text-[10px] font-bold">{vm.cartCount}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center">
              <Bell size={18} color="#475569" />
            </TouchableOpacity>
          </View>
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
      {status === 'not_serviceable' ? (
        <NotServiceableView onUseAnotherPincode={() => router.push('/location')} />
      ) : !village ? (
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

      <LocationPermissionSheet
        visible={permSheetOpen}
        onClose={() => setPermSheetOpen(false)}
        dismissable={!!village}
      />
      <LocationSheet visible={changeSheetOpen} onClose={() => setChangeSheetOpen(false)} />
    </SafeAreaView>
  );
};
