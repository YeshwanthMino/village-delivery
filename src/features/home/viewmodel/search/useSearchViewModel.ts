import { useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useVillageStore } from '@/src/core/store';
import { useProductSearchQuery } from '@/src/features/home/data/queries/useProductSearchQuery';

export const useSearchViewModel = () => {
  const params = useLocalSearchParams<{ categoryId?: string; categoryName?: string }>();

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(
    params.categoryId ?? null,
  );

  // 500ms debounce: API fires only after typing settles.
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query), 500);
    return () => clearTimeout(id);
  }, [query]);

  const cartCount = useVillageStore((state) => state.cartCount());

  const { data, isLoading, isFetching } = useProductSearchQuery(
    debouncedQuery,
    activeCategoryId ?? undefined,
  );

  const results = data?.products ?? [];

  return {
    query,
    setQuery,
    activeCategoryId,
    categoryName: activeCategoryId ? (params.categoryName ?? activeCategoryId) : null,
    clearCategory: () => setActiveCategoryId(null),
    results,
    total: data?.total ?? 0,
    isLoading,
    isFetching,
    cartCount,
  };
};
