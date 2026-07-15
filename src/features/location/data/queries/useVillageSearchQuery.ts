// src/features/location/data/queries/useVillageSearchQuery.ts

import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { queryKeys } from '@/src/base/query/queryKeys';
import { searchVillages } from '../locationApi';

/** Village-directory search. Enabled only at 3+ trimmed characters. */
export const useVillageSearchQuery = (term: string, limit = 24) => {
  const trimmed = term.trim();

  return useQuery({
    queryKey: [...queryKeys.villages.search(trimmed), { limit }],
    queryFn: () => searchVillages(trimmed, { limit }),
    enabled: trimmed.length >= 3,
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
  });
};
