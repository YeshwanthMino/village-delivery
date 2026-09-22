// src/features/location/data/queries/useVillageSearchQuery.ts

import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { queryKeys } from '@/src/base/query/queryKeys';
import { searchVillages } from '../locationApi';
import { useStoreId } from '@/src/core/utils/getStoreId';

/** Village-directory search. Enabled only at 3+ trimmed characters. */
export const useVillageSearchQuery = (term: string, limit = 24) => {
  const trimmed = term.trim();
  const storeId = useStoreId();

  return useQuery({
    queryKey: [...queryKeys.villages.search(trimmed), { limit, storeId }],
    queryFn: () => searchVillages(trimmed, { limit, storeId }),
    enabled: trimmed.length >= 3,
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
  });
};
