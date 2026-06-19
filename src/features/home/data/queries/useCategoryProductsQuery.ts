// src/features/home/data/queries/useCategoryProductsQuery.ts

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/src/base/query/queryKeys';
import { useLocationStore } from '@/src/core/store/useLocationStore';
import { getCategoryProducts } from '../categoryProductsApi';

export const useCategoryProductsQuery = (categoryId?: string, limit = 24) => {
  const storeId = useLocationStore((s) => s.serviceableVillage?.storeId);

  return useQuery({
    queryKey: [...queryKeys.products.byCategory(categoryId ?? ''), { storeId, limit }],
    queryFn: () => getCategoryProducts(storeId!, categoryId!, 0, limit),
    enabled: !!categoryId && !!storeId,
    staleTime: 5 * 60 * 1000,
  });
};
