// src/features/product/views/ProductDetailScreen.tsx

import { ArrowLeft, Search, ChevronDown } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { DynamicProductCard } from '@/src/features/home/views/home/components/DynamicProductCard';
import { useTranslation } from '@/src/core/utils/useTranslation';
import { useVillageStore } from '@/src/core/store/useVillageStore';
import { useProductDetailViewModel } from '../viewmodel/useProductDetailViewModel';
import { ProductImageCarousel } from './components/ProductImageCarousel';
import { ProductCartBar } from './components/ProductCartBar';

export const ProductDetailScreen = () => {
  const vm = useProductDetailViewModel();
  const insets = useSafeAreaInsets();
  const { t, locale } = useTranslation();
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const cart = useVillageStore((s) => s.cart);
  const addToCart = useVillageStore((s) => s.addToCart);
  const decFromCart = useVillageStore((s) => s.decFromCart);

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

  if (!d.active) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={['left', 'right']}>
        {header}
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-slate-500 text-center">{t('product_unavailable')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const displayTitle = locale === 'te' && d.teluguTitle ? d.teluguTitle : d.title;
  const hasVariants = d.variants && d.variants.length > 1;
  const selectedVariant = hasVariants ? d.variants?.[selectedVariantIndex] : undefined;

  // Calculate stock for selected variant or product
  const variantStock = selectedVariant?.stock ?? 0;
  const productInStock = hasVariants ? variantStock > 0 : d.inStock;

  // Display price for selected variant or product
  const displayPrice = selectedVariant ? selectedVariant.price : d.price;
  const displayMrp = selectedVariant ? selectedVariant.mrp : d.mrp;
  const displayDiscount = displayMrp > displayPrice && displayMrp > 0
    ? Math.round(((displayMrp - displayPrice) / displayMrp) * 100)
    : 0;

  // Calculate cart count for selected variant
  // For products with variants (even just 1), use variant key
  let variantCount = 0;
  const hasAnyVariants = d.variants && d.variants.length > 0;
  if (hasAnyVariants && selectedVariantIndex !== undefined) {
    variantCount = cart[`${d.id}-v${selectedVariantIndex}`] ?? 0;
  } else {
    variantCount = cart[d.id] ?? 0;
  }

  // Handlers for variant-aware add/dec
  const handleAddVariant = () => {
    if (!d || !selectedVariant) return;

    // For products with variants (including single-variant), use variant key
    if (hasAnyVariants && selectedVariantIndex !== undefined) {
      const snapshot = {
        key: `${d.id}-v${selectedVariantIndex}`,
        productId: d.id,
        variantIndex: selectedVariantIndex,
        variantId: selectedVariant.id,
        name: d.title,
        nameTE: d.teluguTitle,
        weight: selectedVariant.name,
        price: selectedVariant.price / 20,
        mrp: selectedVariant.mrp / 20,
        listPrice: selectedVariant.listPrice ? selectedVariant.listPrice / 20 : undefined,
        dealPrice: selectedVariant.dealPrice ? selectedVariant.dealPrice / 20 : undefined,
        imageUrl: selectedVariant.image,
        images: selectedVariant.images,
        taxType: selectedVariant.taxType,
        taxRate: selectedVariant.taxRate,
        hasFreeItem: selectedVariant.hasFreeItem,
        hsn: selectedVariant.hsn,
      };
      const maxQuantity = selectedVariant.stock ?? 0;
      addToCart(`${d.id}-v${selectedVariantIndex}`, snapshot, maxQuantity);
    } else {
      // No variants - add as base product
      vm.onAdd();
    }
  };

  const handleDecVariant = () => {
    if (!d) return;

    // For products with variants (including single-variant), use variant key
    if (hasAnyVariants && selectedVariantIndex !== undefined) {
      decFromCart(`${d.id}-v${selectedVariantIndex}`);
    } else {
      vm.onDec();
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['left', 'right']}>
      {header}

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 24 }}>
        <ProductImageCarousel images={selectedVariant?.images || d.images} discountPct={displayDiscount} />

        <View className="px-4 pt-4">
          {d.categoryTitle ? (
            <Text className="text-slate-400 text-xs font-semibold uppercase">{d.categoryTitle}</Text>
          ) : null}

          <Text className="text-slate-900 text-xl font-bold mt-1" style={teFont}>
            {displayTitle}
          </Text>

          <View className="flex-row items-baseline gap-2 flex-wrap mt-3">
            <Text className="text-slate-900 font-extrabold text-2xl">₹{Math.round(displayPrice)}</Text>
            {displayMrp > displayPrice ? (
              <Text className="text-slate-400 text-base line-through">₹{Math.round(displayMrp)}</Text>
            ) : null}
            {displayDiscount > 0 ? (
              <Text className="text-green-700 font-bold text-base">{displayDiscount}% Off</Text>
            ) : null}
          </View>
          <Text className="text-slate-400 text-xs mt-0.5">MRP (inclusive of all taxes)</Text>

          {/* Variant selector */}
          {hasVariants && d.variants && d.variants.length > 0 ? (
            <View className="mt-5">
              <Text className="text-slate-900 font-bold text-base mb-3">
                {d.variants.length === 1 ? 'Available Option' : t('choose_variant') || 'Select Variant'}
              </Text>
              <View className="gap-2">
                {d.variants.map((variant, idx) => {
                  const variantDiscount = variant.mrp > variant.price && variant.mrp > 0
                    ? Math.round(((variant.mrp - variant.price) / variant.mrp) * 100)
                    : 0;
                  const isSelected = idx === selectedVariantIndex;

                  return (
                    <TouchableOpacity
                      key={idx}
                      onPress={() => setSelectedVariantIndex(idx)}
                      className={`border-2 rounded-xl p-3 flex-row items-center justify-between ${
                        isSelected ? 'border-green-600 bg-green-50' : 'border-slate-200'
                      }`}
                    >
                      <View className="flex-1">
                        <Text className={`font-semibold ${isSelected ? 'text-green-700' : 'text-slate-900'}`}>
                          {variant.name}
                        </Text>
                        <View className="flex-row items-center gap-2 mt-1">
                          <Text className="text-slate-900 font-bold">₹{Math.round(variant.price)}</Text>
                          {variant.mrp > variant.price && (
                            <Text className="text-slate-400 text-xs line-through">₹{Math.round(variant.mrp)}</Text>
                          )}
                          {variantDiscount > 0 && (
                            <Text className="text-green-600 text-xs font-semibold">{variantDiscount}% off</Text>
                          )}
                        </View>
                        {variant.stock !== undefined && variant.stock === 0 && (
                          <Text className="text-red-600 text-xs mt-1 font-semibold">{t('out_of_stock') || 'Out of Stock'}</Text>
                        )}
                      </View>
                      {isSelected && (
                        <View className="w-6 h-6 rounded-full bg-green-600 items-center justify-center ml-2">
                          <Text className="text-white font-bold text-sm">✓</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ) : null}

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

      <ProductCartBar count={variantCount} inStock={productInStock} maxQuantity={variantStock} onAdd={handleAddVariant} onDec={handleDecVariant} onViewCart={vm.onViewCart} />
    </SafeAreaView>
  );
};
