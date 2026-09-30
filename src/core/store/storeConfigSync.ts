// src/core/store/storeConfigSync.ts
//
// /app/store-config answers for the active store and branch, so it must be
// fetched again whenever the customer moves to a different village (or the
// village's branch is filled in). Started once from AppScreen.
//
// The first hydration is skipped: the startup load already waits for the saved
// village before it reads the store/branch (see getActiveBranchId).

import { useLocationStore } from './useLocationStore';
import { useStoreConfigStore } from './useStoreConfigStore';
import { queryClient } from '@/src/base/query/queryClient';
import type { Village } from '@/src/features/location/domain/models';

const keyOf = (village: Village | null): string =>
  village?.branchId ?? '';

let stop: (() => void) | null = null;

/** Idempotent; returns the unsubscribe. */
export function startStoreConfigSync(): () => void {
  if (stop) return stop;
  const unsubscribe = useLocationStore.subscribe((state, prev) => {
    if (!prev.hydrated) return;
    if (keyOf(state.serviceableVillage) === keyOf(prev.serviceableVillage)) return;
    // The previous village's hours must never be judged for the new one, so
    // drop them until the new config lands (or the fetch fails → no notice).
    useStoreConfigStore.setState({ store: null });
    // Every cached API response belongs to the previous branch. Reset the whole
    // cache (active queries refetch, inactive ones start empty).
    void queryClient.resetQueries();
    void useStoreConfigStore.getState().refresh();
  });
  stop = () => {
    unsubscribe();
    stop = null;
  };
  return stop;
}
