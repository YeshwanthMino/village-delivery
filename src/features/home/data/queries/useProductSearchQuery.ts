// src/features/home/data/queries/useProductSearchQuery.ts

import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { queryKeys } from '@/src/base/query/queryKeys';
import { useLocationStore } from '@/src/core/store/useLocationStore';
import { searchProducts } from '../searchProductsApi';

export const useProductSearchQuery = (
  term: string,
  categoryId?: string,
  limit = 24,
) => {
  const storeId = useLocationStore((s) => s.serviceableVillage?.storeId);
  const trimmed = term.trim();

  return useQuery({
    queryKey: [...queryKeys.products.search(trimmed), { storeId, categoryId, limit }],
    queryFn: () => searchProducts(storeId!, trimmed, { categoryId, limit }),
    enabled: !!storeId && (trimmed.length > 0 || !!categoryId),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
  });
};
