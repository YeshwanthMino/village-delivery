import { useRouter } from 'expo-router';
import { Bell, ChevronDown, MapPin, Mic, Search } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CategoryTile,
  FloatingCartPill,
  HeroCarousel,
  ProductCard,
  VariantBottomSheet,
} from '@/src/shared/components';
import { useHomeViewModel } from '../../viewmodel/home/useHomeViewModel';
import { useTranslation } from '@/src/core/utils/useTranslation';
import { useVillageStore } from '@/src/core/store/useVillageStore';
import { Locale } from '@/src/base/constants/translations';

export const HomeScreen = () => {
  const router = useRouter();
  const vm = useHomeViewModel();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const locale = useVillageStore((s) => s.locale);
  const setLocale = useVillageStore((s) => s.setLocale);
  const TAB_BAR_CONTENT_HEIGHT = 64;
  const scrollPadding = TAB_BAR_CONTENT_HEIGHT + insets.bottom + 16;

  const goToCategories = (catId?: string) => {
    if (catId) {
      router.push({ pathname: '/category-details', params: { categoryId: catId } } as any);
    } else {
      router.push('/(dashboard)/categories');
    }
  };

  const goToCart = () => router.push('/cart');

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['bottom', 'left', 'right']}>

      {/* ── Top Bar ── */}
      <View className="bg-white px-4 pb-3 border-b border-slate-100" style={{ paddingTop: insets.top + 4 }}>
        {/* Row 1: location + locale toggle + bell */}
        <View className="flex-row items-center justify-between mb-3">
          <TouchableOpacity className="flex-row items-center gap-1.5 flex-1 mr-3">
            <MapPin size={16} color="#16a34a" />
            <View className="flex-1">
              <View className="flex-row items-center gap-1">
                <Text
                  className="text-slate-900 font-bold text-sm"
                  style={locale === 'te' ? { fontFamily: 'NotoSansTelugu_700Bold' } : undefined}
                  numberOfLines={1}
                >
                  {t('home_label')}
                </Text>
                <ChevronDown size={14} color="#64748b" />
              </View>
              <Text className="text-slate-500 text-sm" numberOfLines={1}>
                రాజంపేట · 25 min
              </Text>
            </View>
          </TouchableOpacity>

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
        {/* Hero Carousel */}
        <HeroCarousel
          slides={vm.heroSlides}
          onShopNow={() => goToCategories()}
        />

        {/* Shop by category */}
        <View className="px-4 mt-5">
          <View className="flex-row justify-between items-center mb-3">
            <Text
              className="text-slate-900 font-bold text-base"
              style={locale === 'te' ? { fontFamily: 'NotoSansTelugu_700Bold' } : undefined}
            >
              {t('shop_by_category')}
            </Text>
            <TouchableOpacity onPress={() => goToCategories()}>
              <Text
                className="text-green-600 font-semibold text-sm"
                style={locale === 'te' ? { fontFamily: 'NotoSansTelugu_400Regular' } : undefined}
              >
                {t('see_all')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* 4-col grid — two rows of 4 */}
          <View className="flex-row justify-between mb-3">
            {vm.categories.slice(0, 4).map(cat => (
              <CategoryTile
                key={cat.id}
                category={cat}
                onPress={() => goToCategories(cat.id)}
              />
            ))}
          </View>
          <View className="flex-row justify-between pb-4">
            {vm.categories.slice(4, 8).map(cat => (
              <CategoryTile
                key={cat.id}
                category={cat}
                onPress={() => goToCategories(cat.id)}
              />
            ))}
          </View>
        </View>

        {/* Top picks */}
        <View className="px-4 mt-5">
          <View className="flex-row justify-between items-center mb-3">
            <Text
              className="text-slate-900 font-bold text-base"
              style={locale === 'te' ? { fontFamily: 'NotoSansTelugu_700Bold' } : undefined}
            >
              {t('top_picks')}
            </Text>
            <TouchableOpacity onPress={() => router.push('/top-picks' as any)}>
              <Text
                className="text-green-600 font-semibold text-sm"
                style={locale === 'te' ? { fontFamily: 'NotoSansTelugu_400Regular' } : undefined}
              >
                {t('see_all')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* 2-col product grid */}
          <View className="flex-row flex-wrap gap-3 pb-4">
            {vm.topPicks.map(product => (
              <View key={product.id} style={{ width: '47.5%' }}>
                <ProductCard
                  product={product}
                  openVariants={vm.openVariants}
                />
              </View>
            ))}
          </View>
        </View>
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
