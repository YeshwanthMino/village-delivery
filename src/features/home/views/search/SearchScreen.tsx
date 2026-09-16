import { ArrowLeft, Search, X } from 'lucide-react-native';
import React, { useRef } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { CartSummaryCard } from '@/src/shared/components';
import { VariantBottomSheet } from '@/src/shared/components/VariantBottomSheet';
import { DynamicProductCard } from '../home/components/DynamicProductCard';
import { useSearchViewModel } from '../../viewmodel/search/useSearchViewModel';
import { useTranslation } from '@/src/core/utils/useTranslation';
import { interpolate } from '@/src/base/constants/translations';
import { useVariantSheet } from '@/src/shared/hooks/useVariantSheet';

export const SearchScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const vm = useSearchViewModel();
  const inputRef = useRef<TextInput>(null);
  const { t } = useTranslation();
  const sheet = useVariantSheet();
  // Standalone route (no tab bar). Reserve only enough for the floating cart pill.
  const scrollPadding = 96;

  const goToCart = () => router.push('/cart');

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['bottom', 'left', 'right']}>
      {/* ── Header ── */}
      <View
        className="bg-white border-b border-slate-100 px-4 pb-3 flex-col gap-2"
        style={{ paddingTop: insets.top + 8 }}
      >
        {/* Back + input row */}
        <View className="flex-row items-center gap-3">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-9 h-9 items-center justify-center"
          >
            <ArrowLeft size={22} color="#0f172a" />
          </TouchableOpacity>

          <View className="flex-1 flex-row items-center bg-slate-100 rounded-xl px-3 h-10 gap-2">
            <Search size={16} color="#94a3b8" />
            <TextInput
              ref={inputRef}
              autoFocus
              value={vm.query}
              onChangeText={vm.setQuery}
              placeholder={t('search_brands_ph')}
              placeholderTextColor="#94a3b8"
              className="flex-1 text-slate-900 text-sm"
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
          </View>
        </View>

        {/* Category chip + result count row */}
        {(vm.activeCategoryId || vm.total > 0) && (
          <View className="flex-row items-center gap-2 pl-12">
            {vm.activeCategoryId && (
              <TouchableOpacity
                onPress={vm.clearCategory}
                className="flex-row items-center gap-1 bg-green-50 border border-green-200 rounded-full px-3 py-1"
              >
                <Text className="text-green-700 text-xs font-semibold">
                  {vm.categoryName}
                </Text>
                <X size={12} color="#15803d" />
              </TouchableOpacity>
            )}
            {vm.total > 0 && (
              <Text className="text-slate-400 text-xs">
                {vm.total} result{vm.total !== 1 ? 's' : ''}
              </Text>
            )}
          </View>
        )}
      </View>

      {/* ── Body ── */}
      {vm.isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#15803d" />
        </View>
      ) : vm.results.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          {vm.query.trim().length > 0 ? (
            <Text className="text-slate-400 text-sm">{interpolate(t('no_results'), vm.query.trim())}</Text>
          ) : (
            <Text className="text-slate-400 text-sm">{t('start_typing')}</Text>
          )}
        </View>
      ) : (
        // Search results are unbounded — mapping them inside a ScrollView mounted
        // every card, with its image, before the first frame could paint.
        <FlatList
          data={vm.results}
          keyExtractor={(product) => product.id}
          numColumns={2}
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, paddingBottom: scrollPadding }}
          columnWrapperStyle={{ gap: 12, marginBottom: 12 }}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <View style={{ width: '47.5%' }}>
              <DynamicProductCard
                product={item}
                width="100%"
                onOpenVariants={sheet.open}
              />
            </View>
          )}
        />
      )}

      {/* ── Overlays ── */}
      {vm.cartCount > 0 && (
        <CartSummaryCard onPress={goToCart} bottomOffset={0} />
      )}

      <VariantBottomSheet
        product={sheet.product}
        onClose={sheet.close}
      />
    </SafeAreaView>
  );
};
