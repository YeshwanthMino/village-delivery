// src/features/product/data/queries/useProductDetailQuery.ts

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/src/base/query/queryKeys';
import { useLocationStore } from '@/src/core/store/useLocationStore';
import { getProductDetail } from '../productDetailApi';

export const useProductDetailQuery = (id?: string) => {
  const storeId = useLocationStore((s) => s.serviceableVillage?.storeId);

  return useQuery({
    queryKey: [...queryKeys.products.detail(id ?? ''), { storeId }],
    queryFn: () => getProductDetail(storeId!, id!),
    enabled: !!id && !!storeId,
    staleTime: 5 * 60 * 1000,
  });
};
