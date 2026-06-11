import { useMemo, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Product } from '@/src/base/types/village.types';
import { useVillageStore } from '@/src/core/store';
import { CATEGORIES } from '@/src/features/home/data/static/villageData';
import { useProductsQuery } from '@/src/features/home/data/queries/useProductsQuery';

export const useSearchViewModel = () => {
  const params = useLocalSearchParams<{ categoryId?: string; categoryName?: string }>();

  const [query, setQuery] = useState('');

  const isValidCategory = params.categoryId
    ? CATEGORIES.some(c => c.id === params.categoryId)
    : false;

  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(
    isValidCategory ? (params.categoryId ?? null) : null
  );
  const [variantProduct, setVariantProduct] = useState<Product | null>(null);

  const cartCount = useVillageStore(state => state.cartCount());
  const { data: allProducts = [] } = useProductsQuery();

  const results = useMemo(() => {
    const trimmed = query.toLowerCase().trim();
    if (!trimmed && !activeCategoryId) return [];
    return allProducts
      .filter(p => !activeCategoryId || p.categoryId === activeCategoryId)
      .filter(p => !trimmed || p.name.toLowerCase().includes(trimmed));
  }, [allProducts, query, activeCategoryId]);

  return {
    query,
    setQuery,
    activeCategoryId,
    categoryName: activeCategoryId ? (params.categoryName ?? activeCategoryId) : null,
    clearCategory: () => setActiveCategoryId(null),
    results,
    cartCount,
    variantProduct,
    openVariants: (product: Product) => setVariantProduct(product),
    closeVariants: () => setVariantProduct(null),
  };
};
