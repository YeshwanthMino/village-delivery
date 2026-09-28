// src/core/store/useLocationStore.ts

import { create } from 'zustand';
import { StoredPrefs } from '@/src/base/services/remote/storage/StoredPrefs';
import { StorageKeys } from '@/src/base/constants/AppConstants';
import { Address, LatLng, RecentLocation, ServiceabilityStatus, Village } from '@/src/features/location/domain/models';
import { LocationService, PermissionState } from '@/src/features/location/data/LocationService';
import { findByLocation } from '@/src/features/location/data/locationApi';
import { apiClient } from '@/src/base/services/remote/apiClient';
import { reconcileSelectedId, villageFromAddress } from '@/src/features/location/domain/addressSelection';

const RECENT_LIMIT = 5;

export type LocationErrorKind = 'no_fix' | 'timeout' | 'network';

interface LocationState {
  status: ServiceabilityStatus;
  permission: PermissionState;
  blocked: boolean; // permanently denied ("Don't ask again")
  detecting: boolean;
  lastError: LocationErrorKind | null;
  serviceableVillage: Village | null;
  savedAddresses: Address[];
  selectedAddressId: string | null;
  recentLocations: RecentLocation[];
  hydrated: boolean;
}

interface LocationActions {
  hydrate: () => Promise<void>;
  backfillBranchId: () => Promise<void>;
  /** Resolves once any in-flight branchId lookup has settled (immediately if none). */
  waitForBranch: () => Promise<void>;
  setStatus: (status: ServiceabilityStatus) => void;
  setServiceable: (village: Village, opts?: { keepSelectedAddress?: boolean }) => Promise<void>;
  setNotServiceable: () => void;
  setSavedAddresses: (addresses: Address[]) => void;
  setSelectedAddress: (address: Address) => Promise<void>;
  addRecent: (recent: RecentLocation) => Promise<void>;
  clearLocation: () => Promise<void>;
  refreshPermission: () => Promise<PermissionState>;
  detectCurrentLocation: () => Promise<boolean>;
  searchLocation: (query: string) => Promise<boolean>;
  selectAddress: (address: Address) => Promise<boolean>;
  selectRecent: (recent: RecentLocation) => Promise<void>;
  selectVillage: (village: Village) => Promise<boolean>;
}

type LocationStore = LocationState & LocationActions;

type SetState = (partial: Partial<LocationState>) => void;
type GetState = () => LocationStore;

const initialState: LocationState = {
  status: 'idle',
  permission: 'undetermined',
  blocked: false,
  detecting: false,
  lastError: null,
  serviceableVillage: null,
  savedAddresses: [],
  selectedAddressId: null,
  recentLocations: [],
  hydrated: false,
};

// Module-level race guards (not in render state).
let inflight: Promise<boolean> | null = null;
let seq = 0;
let backfillInflight: Promise<void> | null = null;
let hydrateInflight: Promise<void> | null = null;

/**
 * Coords → serviceability. Drops its result if a newer detect/search started.
 * `addToRecents` defaults true (GPS detect / search); pass false when resolving
 * a saved address, which must never pollute the recent-locations list.
 */
async function resolveCoords(
  set: SetState,
  get: GetState,
  coords: LatLng,
  label: string | undefined,
  token: number,
  opts?: { addToRecents?: boolean },
): Promise<boolean> {
  set({ status: 'checking' });
  try {
    const result = await findByLocation(coords);
    if (token !== seq) return false; // stale — a newer request won
    if (result.serviceable && result.village) {
      const v = result.village;
      await get().setServiceable(v);
      if (v.storeId && opts?.addToRecents !== false) {
        await get().addRecent({
          villageId: v.id,
          storeId: v.storeId,
          branchId: v.branchId,
          villageName: v.name,
          latitude: v.latitude ?? coords.latitude,
          longitude: v.longitude ?? coords.longitude,
          label: label ?? v.name,
          savedAt: Date.now(),
        });
      }
      set({ status: 'serviceable', detecting: false, lastError: null });
      return true;
    }
    set({ status: 'not_serviceable', detecting: false });
    return false;
  } catch {
    if (token !== seq) return false;
    set({ status: 'error', lastError: 'network', detecting: false });
    return false;
  }
}

/** Permission → GPS fix → resolve. */
async function runDetect(set: SetState, get: GetState): Promise<boolean> {
  const token = ++seq;
  set({ status: 'locating', detecting: true, lastError: null });

  const current = await LocationService.getPermissionState();
  if (current !== 'granted') {
    const res = await LocationService.requestPermission();
    set({
      permission: res.granted ? 'granted' : 'denied',
      blocked: !res.granted && !res.canAskAgain,
    });
    if (!res.granted) {
      set({ status: 'idle', detecting: false });
      return false;
    }
  } else {
    set({ permission: 'granted', blocked: false });
  }

  let coords: LatLng;
  try {
    coords = await LocationService.getCurrentPosition();
  } catch (e: any) {
    set({
      status: 'error',
      lastError: e?.message === 'LOCATION_TIMEOUT' ? 'timeout' : 'no_fix',
      detecting: false,
    });
    return false;
  }

  return resolveCoords(set, get, coords, undefined, token);
}

export const useLocationStore = create<LocationStore>((set, get) => ({
  ...initialState,

  hydrate: () => {
    hydrateInflight = (async () => {
      const [village, recents, selectedAddressId] = await Promise.all([
        StoredPrefs.getCustomData<Village>(StorageKeys.SERVICEABLE_VILLAGE),
        StoredPrefs.getCustomData<RecentLocation[]>(StorageKeys.RECENT_LOCATIONS),
        StoredPrefs.getCustomData<string>(StorageKeys.SELECTED_ADDRESS_ID),
      ]);
      set({
        serviceableVillage: village ?? null,
        recentLocations: Array.isArray(recents) ? recents : [],
        selectedAddressId: selectedAddressId ?? null,
        status: village ? 'serviceable' : 'idle',
        hydrated: true,
      });
      // Villages cached before the backend returned `branchId` lack it; refresh
      // in the background so branch-scoped endpoints get `x-branch-id`.
      void get().backfillBranchId();
    })().finally(() => {
      hydrateInflight = null;
    });
    return hydrateInflight;
  },

  // Silent refresh of a cached village that has no branchId: re-runs
  // find-by-location on the village's own coordinates (no GPS/permission prompt)
  // and saves the branchId to the store + cache. Never touches status, recents or
  // the selected address; any failure just leaves the cache as-is.
  backfillBranchId: () => {
    if (backfillInflight) return backfillInflight;
    backfillInflight = (async () => {
      const cached = get().serviceableVillage;
      if (!cached || cached.branchId) return;
      if (cached.latitude == null || cached.longitude == null) return;
      try {
        const result = await findByLocation({ latitude: cached.latitude, longitude: cached.longitude });
        const fresh = result.village;
        if (!result.serviceable || !fresh?.branchId) return;
        // Only accept the branch if it is for the same store, and the user hasn't
        // switched village while the request was in flight.
        if (fresh.storeId !== cached.storeId) return;
        const current = get().serviceableVillage;
        if (!current || current.storeId !== cached.storeId || current.branchId) return;
        const updated = { ...current, branchId: fresh.branchId };
        set({ serviceableVillage: updated });
        await StoredPrefs.setCustomData(StorageKeys.SERVICEABLE_VILLAGE, updated);
      } catch {
        // best-effort; retried on next launch
      }
    })().finally(() => {
      backfillInflight = null;
    });
    return backfillInflight;
  },

  // Branch-scoped requests await this so they don't go out before the lookup
  // lands. Bounded by apiClient's request timeout; never rejects.
  // Also waits for hydrate: startup calls (store-config) can fire before the
  // cached village is loaded, and hydrate is what starts the lookup.
  waitForBranch: async () => {
    if (hydrateInflight) await hydrateInflight.catch(() => {});
    if (backfillInflight) await backfillInflight;
  },

  setStatus: (status) => set({ status }),

  setServiceable: async (village, opts) => {
    set({ serviceableVillage: village, status: 'serviceable' });
    // Switching the active store from a non-address source (GPS, search, recent,
    // map picker) deselects the saved delivery address, so the toolbar shows the
    // new village name. selectAddress passes keepSelectedAddress to re-select.
    if (!opts?.keepSelectedAddress) {
      set({ selectedAddressId: null });
      await StoredPrefs.removeCustomData(StorageKeys.SELECTED_ADDRESS_ID);
    }
    await StoredPrefs.setCustomData(StorageKeys.SERVICEABLE_VILLAGE, village);
  },

  setNotServiceable: () => set({ status: 'not_serviceable' }),

  setSavedAddresses: (addresses) => {
    const prev = get().selectedAddressId;
    // Keep an existing explicit selection only while that address still exists;
    // a stale id (e.g. the selected address was deleted) is cleared. We never
    // auto-select the default — the cart shows an address only when the user
    // explicitly picked one. This deliberately does NOT switch the active
    // serviceable village — that is hydrated/resolved separately.
    const reconciled = reconcileSelectedId(addresses, prev);
    set({ savedAddresses: addresses, selectedAddressId: reconciled });
    if (reconciled !== prev) {
      void StoredPrefs.setCustomData(StorageKeys.SELECTED_ADDRESS_ID, reconciled);
    }
  },

  addRecent: async (recent) => {
    // Identity is the village, not the store: one store/branch commonly serves
    // several villages, so de-duping by storeId would collapse recents for
    // different localities into a single entry. Legacy entries persisted
    // before villageId existed fall back to comparing the display label.
    const isSameLocation = (r: RecentLocation) =>
      recent.villageId && r.villageId ? r.villageId === recent.villageId : r.label === recent.label;
    const next = [
      recent,
      ...get().recentLocations.filter((r) => !isSameLocation(r)),
    ].slice(0, RECENT_LIMIT);
    set({ recentLocations: next });
    await StoredPrefs.setCustomData(StorageKeys.RECENT_LOCATIONS, next);
  },

  clearLocation: async () => {
    set({ serviceableVillage: null, status: 'idle' });
    await StoredPrefs.removeCustomData(StorageKeys.SERVICEABLE_VILLAGE);
  },

  refreshPermission: async () => {
    const permission = await LocationService.getPermissionState();
    set({ permission });
    return permission;
  },

  detectCurrentLocation: async () => {
    if (inflight) return inflight; // dedupe concurrent callers
    inflight = runDetect(set, get);
    try {
      return await inflight;
    } finally {
      inflight = null;
    }
  },

  searchLocation: async (query) => {
    const q = query.trim();
    if (!q) return false;
    const token = ++seq;
    set({ status: 'locating', detecting: true, lastError: null });
    let coords: LatLng | null;
    try {
      coords = await LocationService.geocode(q);
    } catch {
      set({ status: 'error', lastError: 'network', detecting: false });
      return false;
    }
    if (!coords) {
      set({ status: 'idle', detecting: false });
      return false;
    }
    return resolveCoords(set, get, coords, q, token);
  },

  selectAddress: async (address) => {
    // The address payload already carries its village + storeId, so switch the
    // active store directly — no find-by-location round-trip. Selecting a saved
    // address never adds a recent location (recents are for ad-hoc GPS/search).
    const village = villageFromAddress(address);
    if (village) {
      await get().setServiceable(village, { keepSelectedAddress: true });
      set({ selectedAddressId: address.id });
      await StoredPrefs.setCustomData(StorageKeys.SELECTED_ADDRESS_ID, address.id);
      return true;
    }
    // Legacy fallback: an address without a storeId — resolve serviceability
    // from its coords, but skip the recents write.
    if (address.latitude == null || address.longitude == null) return false;
    const token = ++seq;
    const label = [address.addressLine1, address.villageName].filter(Boolean).join(', ');
    set({ status: 'locating', detecting: true, lastError: null });
    const ok = await resolveCoords(
      set,
      get,
      { latitude: address.latitude, longitude: address.longitude },
      label,
      token,
      { addToRecents: false },
    );
    if (ok) {
      set({ selectedAddressId: address.id });
      await StoredPrefs.setCustomData(StorageKeys.SELECTED_ADDRESS_ID, address.id);
    }
    return ok;
  },

  setSelectedAddress: async (address) => {
    // Record the selection so the cart reflects it instantly, then switch the
    // active store. selectAddress handles the store switch without find-by-
    // location (when the address has a storeId) and never adds a recent.
    set({ selectedAddressId: address.id });
    await StoredPrefs.setCustomData(StorageKeys.SELECTED_ADDRESS_ID, address.id);
    await get().selectAddress(address);
  },

  selectRecent: async (r) => {
    const v: Village = {
      id: r.villageId ?? r.storeId,
      name: r.villageName,
      storeId: r.storeId,
      branchId: r.branchId,
      latitude: r.latitude,
      longitude: r.longitude,
    };
    await get().setServiceable(v);
    await get().addRecent({ ...r, savedAt: Date.now() });
  },

  selectVillage: async (village) => {
    // Search results already carry storeId + defaultLocation, so switch the
    // active store directly — no find-by-location round-trip (like selectRecent).
    await get().setServiceable(village);
    if (village.storeId) {
      await get().addRecent({
        villageId: village.id,
        storeId: village.storeId,
        branchId: village.branchId,
        villageName: village.name,
        latitude: village.latitude ?? 0,
        longitude: village.longitude ?? 0,
        label: [village.name, village.secondaryName].filter(Boolean).join(', '),
        savedAt: Date.now(),
      });
    }
    return true;
  },
}));

/**
 * Branch of the active serviceable village. Waits for any in-flight branch
 * lookup, then reads the store, falling back to the persisted copy if the store
 * isn't hydrated yet.
 */
export async function getActiveBranchId(): Promise<string | undefined> {
  await useLocationStore.getState().waitForBranch();
  const fromStore = useLocationStore.getState().serviceableVillage?.branchId;
  if (fromStore) return fromStore;
  try {
    const village = await StoredPrefs.getCustomData<{ branchId?: string }>(StorageKeys.SERVICEABLE_VILLAGE);
    return village?.branchId ?? undefined;
  } catch {
    return undefined;
  }
}

// apiClient adds `x-branch-id` to branch-scoped endpoints centrally.
apiClient.setBranchIdProvider(getActiveBranchId);
