// src/features/home/views/home/components/ProductCarouselRow.tsx

import React, { useState } from 'react';
import { ScrollView, Text, View, ActivityIndicator } from 'react-native';
import { ProductCarouselSection } from '../../../data/homeLayout.types';
import { Product } from '@/src/base/types/village.types';
import { DynamicProductCard } from './DynamicProductCard';
import { VariantBottomSheet } from '@/src/shared/components/VariantBottomSheet';
import { useStoreId } from '@/src/core/utils/getStoreId';
import { getProductDetail } from '@/src/features/product/data/productDetailApi';
import { logger } from '@/src/base/services/logger';

interface Props {
  section: ProductCarouselSection;
}

export const ProductCarouselRow = ({ section }: Props) => {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isLoadingVariants, setIsLoadingVariants] = useState(false);
  const storeId = useStoreId();

  if (!section.products.length) return null;

  // Fetch full product with variants when variant sheet is opened
  const handleOpenVariants = async (product: Product) => {
    setIsLoadingVariants(true);
    try {
      const fullProduct = await getProductDetail(storeId, product.id);
      // Convert ProductDetail back to Product format for VariantBottomSheet
      setSelectedProduct({
        id: fullProduct.id,
        categoryId: '',
        name: fullProduct.title,
        nameTE: fullProduct.teluguTitle || '',
        weight: '',
        price: fullProduct.price,
        mrp: fullProduct.mrp,
        rating: 0,
        reviews: 0,
        image: fullProduct.image,
        variants: fullProduct.variants,
      });
    } catch (error) {
      logger.error('Failed to fetch product details:', error);
    } finally {
      setIsLoadingVariants(false);
    }
  };

  return (
    <View className="pt-5">
      {!section.hideTitle && section.title ? (
        <Text className="text-slate-900 font-bold text-lg px-4 mb-3">{section.title}</Text>
      ) : null}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
      >
        {section.products.map((p) => (
          <DynamicProductCard
            key={p.id}
            product={p}
            onOpenVariants={handleOpenVariants}
          />
        ))}
      </ScrollView>

      <VariantBottomSheet
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
      />
    </View>
  );
};
