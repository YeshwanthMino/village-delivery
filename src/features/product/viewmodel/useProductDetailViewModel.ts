// src/features/product/viewmodel/useProductDetailViewModel.ts

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useVillageStore } from '@/src/core/store/useVillageStore';
import { useProductDetailQuery } from '../data/queries/useProductDetailQuery';
import { ProductDetail } from '../data/productDetail.types';

export function useProductDetailViewModel() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const query = useProductDetailQuery(id);
  const detail = query.data;

  const cart = useVillageStore((s) => s.cart);
  const addToCart = useVillageStore((s) => s.addToCart);
  const decFromCart = useVillageStore((s) => s.decFromCart);

  const count = detail ? cart[detail.id] ?? 0 : 0;

  // API prices are real rupees; the cart pipeline works in "units" (display ×20).
  const onAdd = () => {
    if (!detail) return;
    addToCart(detail.id, {
      key: detail.id,
      productId: detail.id,
      variantIndex: null,
      name: detail.title,
      nameTE: detail.teluguTitle,
      weight: '',
      price: detail.price / 20,
      mrp: detail.mrp / 20,
      imageUrl: detail.image,
    });
  };

  const onDec = () => {
    if (detail) decFromCart(detail.id);
  };

  return {
    detail: detail as ProductDetail | undefined,
    loading: query.isLoading,
    error: query.isError,
    refetch: query.refetch,
    count,
    onAdd,
    onDec,
    onViewCart: () => router.push('/cart' as any),
    onBack: () => router.back(),
    onSearch: () => router.push('/search' as any),
  };
}
