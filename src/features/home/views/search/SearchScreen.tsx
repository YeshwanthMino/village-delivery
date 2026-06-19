import { ArrowLeft, Search, X } from 'lucide-react-native';
import React, { useRef } from 'react';
import {
  ActivityIndicator,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { FloatingCartPill } from '@/src/shared/components';
import { DynamicProductCard } from '../home/components/DynamicProductCard';
import { useSearchViewModel } from '../../viewmodel/search/useSearchViewModel';
import { useTranslation } from '@/src/core/utils/useTranslation';
import { interpolate } from '@/src/base/constants/translations';

export const SearchScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const vm = useSearchViewModel();
  const inputRef = useRef<TextInput>(null);
  const { t } = useTranslation();
  const TAB_BAR_CONTENT_HEIGHT = 64;
  const scrollPadding = TAB_BAR_CONTENT_HEIGHT + insets.bottom + 16;

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
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, paddingBottom: scrollPadding }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="flex-row flex-wrap gap-3">
            {vm.results.map((product) => (
              <View key={product.id} style={{ width: '47.5%' }}>
                <DynamicProductCard product={product} width="100%" />
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      {/* ── Overlays ── */}
      {vm.cartCount > 0 && (
        <FloatingCartPill count={vm.cartCount} onPress={goToCart} />
      )}
    </SafeAreaView>
  );
};
