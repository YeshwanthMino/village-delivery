// src/core/store/useLocationStore.ts

import { create } from 'zustand';
import { StoredPrefs } from '@/src/base/services/remote/storage/StoredPrefs';
import { StorageKeys } from '@/src/base/constants/AppConstants';
import { Address, RecentLocation, ServiceabilityStatus, Village } from '@/src/features/location/domain/models';

const RECENT_LIMIT = 5;

interface LocationState {
  status: ServiceabilityStatus;
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
}

type LocationStore = LocationState & LocationActions;

const initialState: LocationState = {
  status: 'idle',
  serviceableVillage: null,
  savedAddresses: [],
  recentLocations: [],
  hydrated: false,
};

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
}));
