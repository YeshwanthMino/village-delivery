import { useMemo, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Product } from '@/src/base/types/village.types';
import { useVillageStore } from '@/src/core/store';
import { ALL_PRODUCTS } from '@/src/features/home/data/static/villageData';

export const useSearchViewModel = () => {
  const params = useLocalSearchParams<{
    categoryId?: string;
    categoryName?: string;
  }>();

  const [query, setQuery] = useState('');
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(
    params.categoryId ?? null
  );
  const [variantProduct, setVariantProduct] = useState<Product | null>(null);

  const cartCount = useVillageStore(state => state.cartCount());

  const results = useMemo(() => {
    const trimmed = query.toLowerCase().trim();

    if (!trimmed && !activeCategoryId) return [];

    return ALL_PRODUCTS
      .filter(p => !activeCategoryId || p.categoryId === activeCategoryId)
      .filter(p => !trimmed || p.name.toLowerCase().includes(trimmed));
  }, [query, activeCategoryId]);

  const clearCategory = () => setActiveCategoryId(null);

  const openVariants = (product: Product) => setVariantProduct(product);
  const closeVariants = () => setVariantProduct(null);

  return {
    query,
    setQuery,
    activeCategoryId,
    categoryName: activeCategoryId ? (params.categoryName ?? activeCategoryId) : null,
    clearCategory,
    results,
    cartCount,
    variantProduct,
    openVariants,
    closeVariants,
  };
};
