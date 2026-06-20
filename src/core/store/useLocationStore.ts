// src/core/store/useLocationStore.ts

import { create } from 'zustand';
import { StoredPrefs } from '@/src/base/services/remote/storage/StoredPrefs';
import { StorageKeys } from '@/src/base/constants/AppConstants';
import { Address, LatLng, RecentLocation, ServiceabilityStatus, Village } from '@/src/features/location/domain/models';
import { LocationService, PermissionState } from '@/src/features/location/data/LocationService';
import { findByLocation } from '@/src/features/location/data/locationApi';

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
  recentLocations: RecentLocation[];
  hydrated: boolean;
}

interface LocationActions {
  hydrate: () => Promise<void>;
  setStatus: (status: ServiceabilityStatus) => void;
  setServiceable: (village: Village) => Promise<void>;
  setNotServiceable: () => void;
  setSavedAddresses: (addresses: Address[]) => void;
  addRecent: (recent: RecentLocation) => Promise<void>;
  clearLocation: () => Promise<void>;
  refreshPermission: () => Promise<PermissionState>;
  detectCurrentLocation: () => Promise<boolean>;
  searchLocation: (query: string) => Promise<boolean>;
  selectAddress: (address: Address) => Promise<boolean>;
  selectRecent: (recent: RecentLocation) => Promise<void>;
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
  recentLocations: [],
  hydrated: false,
};

// Module-level race guards (not in render state).
let inflight: Promise<boolean> | null = null;
let seq = 0;

/** Coords → serviceability. Drops its result if a newer detect/search started. */
async function resolveCoords(
  set: SetState,
  get: GetState,
  coords: LatLng,
  label: string | undefined,
  token: number,
): Promise<boolean> {
  set({ status: 'checking' });
  try {
    const result = await findByLocation(coords);
    if (token !== seq) return false; // stale — a newer request won
    if (result.serviceable && result.village) {
      const v = result.village;
      await get().setServiceable(v);
      if (v.storeId) {
        await get().addRecent({
          storeId: v.storeId,
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

  hydrate: async () => {
    const [village, recents] = await Promise.all([
      StoredPrefs.getCustomData<Village>(StorageKeys.SERVICEABLE_VILLAGE),
      StoredPrefs.getCustomData<RecentLocation[]>(StorageKeys.RECENT_LOCATIONS),
    ]);
    set({
      serviceableVillage: village ?? null,
      recentLocations: Array.isArray(recents) ? recents : [],
      status: village ? 'serviceable' : 'idle',
      hydrated: true,
    });
  },

  setStatus: (status) => set({ status }),

  setServiceable: async (village) => {
    set({ serviceableVillage: village, status: 'serviceable' });
    await StoredPrefs.setCustomData(StorageKeys.SERVICEABLE_VILLAGE, village);
  },

  setNotServiceable: () => set({ status: 'not_serviceable' }),

  setSavedAddresses: (addresses) => set({ savedAddresses: addresses }),

  addRecent: async (recent) => {
    const next = [
      recent,
      ...get().recentLocations.filter((r) => r.storeId !== recent.storeId),
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
    if (address.latitude == null || address.longitude == null) return false;
    const token = ++seq;
    const label = [address.addressLine1, address.villageName].filter(Boolean).join(', ');
    set({ detecting: true, lastError: null });
    return resolveCoords(
      set,
      get,
      { latitude: address.latitude, longitude: address.longitude },
      label,
      token,
    );
  },

  selectRecent: async (r) => {
    const v: Village = {
      id: r.storeId,
      name: r.villageName,
      storeId: r.storeId,
      latitude: r.latitude,
      longitude: r.longitude,
    };
    await get().setServiceable(v);
    await get().addRecent({ ...r, savedAt: Date.now() });
  },
}));
