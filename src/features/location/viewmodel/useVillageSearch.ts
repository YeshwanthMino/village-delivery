// src/features/location/viewmodel/useVillageSearch.ts
//
// Shared query state for the village-directory search field: the live text, its
// debounce, and the resulting list. Used by both the standalone location screen
// and the map's search screen so the two behave identically.

import { useEffect, useState } from 'react';
import type { Village } from '../domain/models';
import { useVillageSearchQuery } from '../data/queries/useVillageSearchQuery';

/** Typing must settle for this long before the request fires. */
const DEBOUNCE_MS = 500;
/** Matches the query hook's own `enabled` threshold. */
const MIN_CHARS = 3;

const EMPTY: Village[] = [];

export interface VillageSearch<T extends Village = Village> {
  query: string;
  setQuery: (next: string) => void;
  results: T[];
  isFetching: boolean;
  isError: boolean;
  /** The query is long enough that the results section should be shown. */
  showResults: boolean;
  /** Debounce hasn't caught up yet — treat as "searching" so the empty state doesn't flash. */
  searchPending: boolean;
}

/**
 * @param filter optional narrowing applied to the raw results — passed in
 * rather than applied by the caller so the "no villages found" empty state
 * reflects what the user can actually pick. A filter that narrows the type
 * (e.g. `withCoordinates`) narrows `results` with it.
 */
export function useVillageSearch<T extends Village = Village>(
  filter?: (villages: Village[]) => T[],
): VillageSearch<T> {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query), DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [query]);

  const search = useVillageSearchQuery(debouncedQuery);
  const raw = search.data ?? EMPTY;

  return {
    query,
    setQuery,
    // Cheap enough (the query caps at 24 rows) not to warrant memoising, which
    // would only re-run anyway whenever an inline `filter` identity changes.
    results: filter ? filter(raw) : (raw as T[]),
    isFetching: search.isFetching,
    isError: search.isError,
    showResults: query.trim().length >= MIN_CHARS,
    searchPending: query.trim() !== debouncedQuery.trim(),
  };
}
