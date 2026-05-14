import React from 'react';
import { Text, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { CategoryBigCard, FloatingCartPill } from '@/src/shared/components';
import { useCategoriesViewModel } from '../../viewmodel/categories/useCategoriesViewModel';
import { useRouter } from 'expo-router';
import { useTranslation } from '@/src/core/utils/useTranslation';
import { interpolate } from '@/src/base/constants/translations';

export const CategoriesScreen = () => {
  const router = useRouter();
  const vm = useCategoriesViewModel();
  const insets = useSafeAreaInsets();
  const { t, locale } = useTranslation();
  const teFont = locale === 'te' ? { fontFamily: 'NotoSansTelugu_700Bold' } : undefined;
  const TAB_BAR_CONTENT_HEIGHT = 64;
  const scrollPadding = TAB_BAR_CONTENT_HEIGHT + insets.bottom + 16;

  const goToCart = () => router.push('/(dashboard)/cart');

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['bottom', 'left', 'right']}>
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
        {/* Header */}
        <View className="px-4 pb-2" style={{ paddingTop: insets.top + 16 }}>
          <Text className="text-slate-900 font-black text-2xl" style={teFont}>{t('groceries_title')}</Text>
          <Text className="text-slate-500 text-sm mt-1">
            {interpolate(t('items_label'), vm.categories.length * 6)} · {interpolate(t('cat_count'), vm.categories.length)}
          </Text>
        </View>

        {/* 2-col category grid */}
        <View className="px-4 gap-3 pb-4">
          {Array.from({ length: Math.ceil(vm.categories.length / 2) }, (_, rowIdx) => (
            <View key={rowIdx} className="flex-row gap-3">
              {vm.categories.slice(rowIdx * 2, rowIdx * 2 + 2).map(cat => (
                <View key={cat.id} className="flex-1">
                  <CategoryBigCard
                    category={cat}
                    itemCount={vm.productCountInCat(cat.id)}
                    onPress={() => router.push({ pathname: '/category-details', params: { categoryId: cat.id } } as any)}
                  />
                </View>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>

      {vm.cartCount > 0 && (
        <FloatingCartPill count={vm.cartCount} onPress={goToCart} />
      )}
    </SafeAreaView>
  );
};
