// src/features/product/viewmodel/useProductDetailViewModel.ts

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useVillageStore } from '@/src/core/store/useVillageStore';
import { useProductDetailQuery } from '../data/queries/useProductDetailQuery';
import { ProductDetail } from '../data/productDetail.types';
import { CartSnapshot } from '@/src/base/types/village.types';

export function useProductDetailViewModel(selectedVariantIndex?: number | null) {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const query = useProductDetailQuery(id);
  const detail = query.data;

  const cart = useVillageStore((s) => s.cart);
  const addToCart = useVillageStore((s) => s.addToCart);
  const decFromCart = useVillageStore((s) => s.decFromCart);

  // When product has variants, use the passed-in selected index or default to 0
  const hasVariants = detail?.variants && detail.variants.length > 1;
  const activeVariantIndex = hasVariants ? (selectedVariantIndex ?? 0) : null;
  const selectedVariant = activeVariantIndex !== null ? detail?.variants?.[activeVariantIndex] : undefined;

  // Calculate count based on whether we have a variant selected
  let count = 0;
  if (detail) {
    if (hasVariants && activeVariantIndex !== null) {
      count = cart[`${detail.id}-v${activeVariantIndex}`] ?? 0;
    } else {
      count = cart[detail.id] ?? 0;
    }
  }

  // API prices are real rupees; the cart pipeline works in "units" (display ×20).
  const onAdd = () => {
    if (!detail) return;

    let snapshot: CartSnapshot;
    if (hasVariants && selectedVariant && activeVariantIndex !== null) {
      // Add with variant information
      snapshot = {
        key: `${detail.id}-v${activeVariantIndex}`,
        productId: detail.id,
        variantIndex: activeVariantIndex,
        variantId: selectedVariant.id,
        name: detail.title,
        nameTE: detail.teluguTitle,
        weight: selectedVariant.name,
        price: selectedVariant.price,
        mrp: selectedVariant.mrp,
        listPrice: selectedVariant.listPrice ? selectedVariant.listPrice : undefined,
        dealPrice: selectedVariant.dealPrice ? selectedVariant.dealPrice : undefined,
        imageUrl: selectedVariant.image,
        images: selectedVariant.images,
        taxType: selectedVariant.taxType,
        taxRate: selectedVariant.taxRate,
        hasFreeItem: selectedVariant.hasFreeItem,
        hsn: selectedVariant.hsn,
      };
      const maxQuantity = selectedVariant.stock ?? 0;
      addToCart(`${detail.id}-v${activeVariantIndex}`, snapshot, maxQuantity);
    } else {
      // Add base product (no variant)
      snapshot = {
        key: detail.id,
        productId: detail.id,
        variantIndex: null,
        name: detail.title,
        nameTE: detail.teluguTitle,
        weight: '',
        price: detail.price,
        mrp: detail.mrp,
        imageUrl: detail.image,
        images: detail.images,
      };
      const maxQuantity = detail.stock ?? 0;
      addToCart(detail.id, snapshot, maxQuantity);
    }
  };

  const onDec = () => {
    if (!detail) return;
    if (hasVariants && activeVariantIndex !== null) {
      decFromCart(`${detail.id}-v${activeVariantIndex}`);
    } else {
      decFromCart(detail.id);
    }
  };

  return {
    detail: detail as ProductDetail | undefined,
    loading: query.isLoading,
    error: query.isError,
    refetch: query.refetch,
    count,
    hasVariants,
    selectedVariantIndex: activeVariantIndex,
    onAdd,
    onDec,
    onViewCart: () => router.push('/cart'),
    onBack: () => router.back(),
    onSearch: () => router.push('/search'),
  };
}
