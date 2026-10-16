// src/features/home/data/queries/useSaleProductsQuery.ts

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/src/base/query/queryKeys';
import { getSaleBySlug } from '../saleProductsApi';
import { useStoreId } from '@/src/core/utils/getStoreId';

export const useSaleProductsQuery = (slug?: string) => {
  const storeId = useStoreId();

  return useQuery({
    queryKey: [...queryKeys.sales.bySlug(slug ?? ''), { storeId }],
    queryFn: ({ signal }) => getSaleBySlug(storeId, slug || '', signal),
    enabled: !!slug && !!storeId,
    staleTime: 5 * 60 * 1000,
  });
};
