// src/core/store/useStoreConfigStore.ts
//
// The single source of truth for /app/store-config: store details, weekly
// timings and the cashback programme. Loaded once on app start (AppScreen)
// and read everywhere else — React code through the hooks below, pure domain
// code (bill.ts) through the sync getters.
//
// Cashback settings always have a value: the bundled defaults stand in until
// the fetch lands, so nothing has to render a "settings unknown" state and
// the money math never sees an undefined fee. Store details stay null until
// the real ones arrive — see storeConfigDefaults.ts for why.

import { create } from 'zustand';
import { fetchStoreConfig } from '@/src/features/storeConfig/data/storeConfigApi';
import { DEFAULT_CASHBACK_SETTINGS } from '@/src/features/storeConfig/data/storeConfigDefaults';
import type {
  CashbackSettings,
  StoreInfo,
  WeeklyStoreTimings,
} from '@/src/features/storeConfig/data/storeConfig.types';
import { logger } from '@/src/base/services/logger';

export type StoreConfigStatus = 'idle' | 'loading' | 'ready' | 'error';

interface StoreConfigState {
  store: StoreInfo | null;
  cashbackSettings: CashbackSettings;
  status: StoreConfigStatus;
  /** Epoch ms of the last successful load; null before one. */
  loadedAt: number | null;
}

interface StoreConfigActions {
  /** Fetch once. Repeat calls while a fetch is in flight share it, and a call
   *  after a successful load is a no-op — use `refresh` to force a re-fetch. */
  load: () => Promise<void>;
  refresh: () => Promise<void>;
  /** Test seam: restore the pre-fetch state. */
  reset: () => void;
}

const initialState: StoreConfigState = {
  store: null,
  cashbackSettings: DEFAULT_CASHBACK_SETTINGS,
  status: 'idle',
  loadedAt: null,
};

// Module-scoped so every caller of load() awaits the same request rather than
// racing one per screen on a cold start.
let inFlight: Promise<void> | null = null;

export const useStoreConfigStore = create<StoreConfigState & StoreConfigActions>((set, get) => ({
  ...initialState,

  load: async () => {
    if (get().status === 'ready') return;
    if (inFlight) return inFlight;

    set({ status: 'loading' });
    inFlight = (async () => {
      try {
        const { store, cashbackSettings } = await fetchStoreConfig();
        set({
          store,
          // A response without cashback settings leaves the defaults standing;
          // it must not blank the programme out.
          cashbackSettings: cashbackSettings ?? get().cashbackSettings,
          status: 'ready',
          loadedAt: Date.now(),
        });
      } catch (error) {
        // Non-fatal: the app runs on the bundled defaults. Logged, not surfaced
        // — there is nothing the customer can do about it.
        logger.warn('Store config load failed; using defaults', error);
        set({ status: 'error' });
      } finally {
        inFlight = null;
      }
    })();

    return inFlight;
  },

  refresh: async () => {
    set({ status: 'idle' });
    await get().load();
  },

  reset: () => {
    inFlight = null;
    set(initialState);
  },
}));

// ---- Sync getters, for code that cannot subscribe (pure domain, imperative
// API paths). React code should use the hooks below so it re-renders when the
// fetched config replaces the defaults.

export function getCashbackSettings(): CashbackSettings {
  return useStoreConfigStore.getState().cashbackSettings;
}

export function getStoreInfo(): StoreInfo | null {
  return useStoreConfigStore.getState().store;
}

export function getStoreTimings(): WeeklyStoreTimings | null {
  return useStoreConfigStore.getState().store?.timings ?? null;
}

/** Kick off the one startup fetch. Safe to call more than once. */
export function loadStoreConfig(): Promise<void> {
  return useStoreConfigStore.getState().load();
}

// ---- Hooks

export function useCashbackSettings(): CashbackSettings {
  return useStoreConfigStore((state) => state.cashbackSettings);
}

export function useStoreInfo(): StoreInfo | null {
  return useStoreConfigStore((state) => state.store);
}

export function useStoreTimings(): WeeklyStoreTimings | null {
  return useStoreConfigStore((state) => state.store?.timings ?? null);
}
