// src/features/location/data/queries/useVillageSearchQuery.ts

import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { queryKeys } from '@/src/base/query/queryKeys';
import { useLocationStore } from '@/src/core/store/useLocationStore';
import { searchVillages } from '../locationApi';

/** Village-directory search. Enabled only at 3+ trimmed characters. */
export const useVillageSearchQuery = (term: string, limit = 24) => {
  const trimmed = term.trim();
  // Forward the active store's id as x-store-id when one is already selected.
  const storeId = useLocationStore((s) => s.serviceableVillage?.storeId);

  return useQuery({
    queryKey: [...queryKeys.villages.search(trimmed), { limit, storeId }],
    queryFn: () => searchVillages(trimmed, { limit, storeId }),
    enabled: trimmed.length >= 3,
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
  });
};
