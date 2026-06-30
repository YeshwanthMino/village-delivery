// src/features/product/views/ProductDetailScreen.tsx

import { ArrowLeft, Search } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { DynamicProductCard } from '@/src/features/home/views/home/components/DynamicProductCard';
import { useTranslation } from '@/src/core/utils/useTranslation';
import { useProductDetailViewModel } from '../viewmodel/useProductDetailViewModel';
import { ProductImageCarousel } from './components/ProductImageCarousel';
import { ProductCartBar } from './components/ProductCartBar';

export const ProductDetailScreen = () => {
  const vm = useProductDetailViewModel();
  const insets = useSafeAreaInsets();
  const { locale } = useTranslation();
  const teFont = locale === 'te' ? { fontFamily: 'NotoSansTelugu_700Bold' } : undefined;

  const header = (
    <View className="bg-white border-b border-slate-100" style={{ paddingTop: insets.top + 8 }}>
      <View className="px-4 pb-3 flex-row items-center justify-between">
        <TouchableOpacity onPress={vm.onBack} className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center">
          <ArrowLeft size={20} color="#0f172a" />
        </TouchableOpacity>
        <TouchableOpacity onPress={vm.onSearch} className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center">
          <Search size={18} color="#334155" />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (vm.loading) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={['left', 'right']}>
        {header}
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#16a34a" />
        </View>
      </SafeAreaView>
    );
  }

  if (vm.error || !vm.detail) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={['left', 'right']}>
        {header}
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-slate-500 text-center mb-4">Couldn't load this product.</Text>
          <TouchableOpacity onPress={() => vm.refetch()} className="border-2 border-green-600 rounded-xl px-6 py-3">
            <Text className="text-green-700 font-bold">Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const d = vm.detail;
  const displayTitle = locale === 'te' && d.teluguTitle ? d.teluguTitle : d.title;

  if (!d.active) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={['left', 'right']}>
        {header}
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-slate-500 text-center">This product is no longer available.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['left', 'right']}>
      {header}

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 24 }}>
        <ProductImageCarousel images={d.images} discountPct={d.discountPct} />

        <View className="px-4 pt-4">
          {d.categoryTitle ? (
            <Text className="text-slate-400 text-xs font-semibold uppercase">{d.categoryTitle}</Text>
          ) : null}

          <Text className="text-slate-900 text-xl font-bold mt-1" style={teFont}>
            {displayTitle}
          </Text>

          <View className="flex-row items-baseline gap-2 flex-wrap mt-3">
            <Text className="text-slate-900 font-extrabold text-2xl">₹{Math.round(d.price)}</Text>
            {d.mrp > d.price ? (
              <Text className="text-slate-400 text-base line-through">₹{Math.round(d.mrp)}</Text>
            ) : null}
            {d.discountPct > 0 ? (
              <Text className="text-green-700 font-bold text-base">{d.discountPct}% Off</Text>
            ) : null}
          </View>
          <Text className="text-slate-400 text-xs mt-0.5">MRP (inclusive of all taxes)</Text>

          {d.description.trim().length > 0 ? (
            <View className="mt-5">
              <Text className="text-slate-900 font-bold text-base mb-1">Description</Text>
              <Text className="text-slate-600 text-sm leading-5">{d.description}</Text>
            </View>
          ) : null}
        </View>

        {d.similarProducts.length > 0 ? (
          <View className="mt-6">
            <Text className="text-slate-900 font-bold text-base px-4 mb-3">You might also like</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
            >
              {d.similarProducts.map((p) => (
                <DynamicProductCard key={p.id} product={p} />
              ))}
            </ScrollView>
          </View>
        ) : null}
      </ScrollView>

      <ProductCartBar count={vm.count} inStock={d.inStock} onAdd={vm.onAdd} onDec={vm.onDec} onViewCart={vm.onViewCart} />
    </SafeAreaView>
  );
};
