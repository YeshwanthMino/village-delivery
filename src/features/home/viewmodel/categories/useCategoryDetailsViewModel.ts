import { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useVillageStore } from '@/src/core/store';
import { CategoryItem } from '@/src/features/home/data/homeLayout.types';
import { useCategoryProductsQuery } from '@/src/features/home/data/queries/useCategoryProductsQuery';

export const useCategoryDetailsViewModel = () => {
  const params = useLocalSearchParams<{
    categoryId?: string;
    title?: string;
    subcategories?: string;
  }>();
  const cartCount = useVillageStore((s) => s.cartCount());

  // Rail = sibling sub-categories passed from the previous page. Fall back to a
  // single item built from the route when the param is missing/malformed.
  const railItems = useMemo<CategoryItem[]>(() => {
    try {
      const parsed = params.subcategories ? JSON.parse(params.subcategories) : null;
      if (Array.isArray(parsed) && parsed.length) return parsed as CategoryItem[];
    } catch {
      // ignore malformed param
    }
    if (params.categoryId) {
      return [{ id: params.categoryId, title: params.title ?? '', imageUrl: '' }];
    }
    return [];
  }, [params.subcategories, params.categoryId, params.title]);

  const [selectedId, setSelectedId] = useState<string | undefined>(
    params.categoryId ?? railItems[0]?.id,
  );

  // Grow-the-window pagination: refetch a larger first page on "load more".
  const [limit, setLimit] = useState(24);
  useEffect(() => {
    setLimit(24);
  }, [selectedId]);

  const query = useCategoryProductsQuery(selectedId, limit);
  const products = query.data?.products ?? [];
  const total = query.data?.total ?? 0;

  const selectedItem = railItems.find((i) => i.id === selectedId) ?? null;

  return {
    title: params.title ?? '',
    railItems,
    selectedId,
    select: setSelectedId,
    selectedItem,
    products,
    total,
    hasMore: total > products.length,
    loadMore: () => setLimit((l) => l + 24),
    loading: query.isLoading,
    loadingMore: query.isFetching && !query.isLoading,
    error: query.isError,
    refetch: query.refetch,
    cartCount,
  };
};
