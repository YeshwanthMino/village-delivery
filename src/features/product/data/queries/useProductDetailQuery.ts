// src/features/product/data/queries/useProductDetailQuery.ts

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/src/base/query/queryKeys';
import { getProductDetail } from '../productDetailApi';
import { useStoreId } from '@/src/core/utils/getStoreId';

export const useProductDetailQuery = (id?: string) => {
  const storeId = useStoreId();

  return useQuery({
    queryKey: [...queryKeys.products.detail(id ?? ''), { storeId }],
    queryFn: () => getProductDetail(storeId, id || ''),
    enabled: !!id && !!storeId,
    staleTime: 5 * 60 * 1000,
  });
};
