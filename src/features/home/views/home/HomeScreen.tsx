import { useRouter } from 'expo-router';
import { Bell, Mic, Search } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { FloatingCartPill, VariantBottomSheet } from '@/src/shared/components';
import { useHomeViewModel } from '../../viewmodel/home/useHomeViewModel';
import { useHomeLayoutViewModel } from '../../viewmodel/home/useHomeLayoutViewModel';
import { HomeSections } from './components/HomeSections';
import { useTranslation } from '@/src/core/utils/useTranslation';
import { useVillageStore } from '@/src/core/store/useVillageStore';
import { Locale } from '@/src/base/constants/translations';
import { useLocationStore } from '@/src/core/store/useLocationStore';
import { LocationHeader } from '@/src/features/location/views/components/LocationHeader';
import { LocationEntrySheet } from '@/src/features/location/views/LocationEntrySheet';
import { AddressBottomSheet } from '@/src/features/location/views/AddressBottomSheet';
import { useAuthStore } from '@/src/core/store';

export const HomeScreen = () => {
  const router = useRouter();
  const vm = useHomeViewModel();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const locale = useVillageStore((s) => s.locale);
  const setLocale = useVillageStore((s) => s.setLocale);
  const village = useLocationStore((s) => s.serviceableVillage);
  const [locationSheetOpen, setLocationSheetOpen] = React.useState(false);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [addressSheetOpen, setAddressSheetOpen] = React.useState(false);
  const layout = useHomeLayoutViewModel();
  const TAB_BAR_CONTENT_HEIGHT = 64;
  const scrollPadding = TAB_BAR_CONTENT_HEIGHT + insets.bottom + 16;

  const goToCart = () => router.push('/cart');

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['bottom', 'left', 'right']}>

      {/* ── Top Bar ── */}
      <View className="bg-white px-4 pb-3 border-b border-slate-100" style={{ paddingTop: insets.top + 4 }}>
        {/* Row 1: location + locale toggle + bell */}
        <View className="flex-row items-center justify-between mb-3">
          <LocationHeader
            etaMinutes={8}
            minutesLabel={t('minutes_label')}
            primaryLabel={village?.name ?? t('home_label')}
            secondaryLabel={village?.pincode ?? ''}
            onPressLocation={() => (isAuthenticated ? setAddressSheetOpen(true) : setLocationSheetOpen(true))}
            onPressProfile={() => router.push('/(dashboard)/profile')}
          />

          {/* Locale toggle pill */}
          <View className="flex-row bg-slate-100 rounded-full p-0.5 mr-2">
            {(['te', 'en'] as Locale[]).map((lang) => (
              <TouchableOpacity
                key={lang}
                onPress={() => setLocale(lang)}
                className={`px-2.5 py-1 rounded-full ${locale === lang ? 'bg-green-600' : ''}`}
              >
                <Text
                  className={`text-xs font-bold ${locale === lang ? 'text-white' : 'text-slate-500'}`}
                  style={lang === 'te' ? { fontFamily: 'NotoSansTelugu_700Bold', fontSize: 13 } : undefined}
                >
                  {lang === 'te' ? 'తె' : 'EN'}
                </Text>
              </TouchableOpacity>
            ))}
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
          <View className="py-16 items-center">
            <ActivityIndicator size="large" color="#16a34a" />
          </View>
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
      <LocationEntrySheet visible={locationSheetOpen} onClose={() => setLocationSheetOpen(false)} />
      <AddressBottomSheet visible={addressSheetOpen} onClose={() => setAddressSheetOpen(false)} />
    </SafeAreaView>
  );
};
