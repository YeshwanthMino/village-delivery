// src/core/store/useLocationStore.ts

import { create } from 'zustand';
import { StoredPrefs } from '@/src/base/services/remote/storage/StoredPrefs';
import { StorageKeys } from '@/src/base/constants/AppConstants';
import { Address, ServiceabilityStatus, Village } from '@/src/features/location/domain/models';

interface LocationState {
  status: ServiceabilityStatus;
  serviceableVillage: Village | null;
  selectedAddressId: string | null;
  savedAddresses: Address[];
  hydrated: boolean;
}

interface LocationActions {
  hydrate: () => Promise<void>;
  setStatus: (status: ServiceabilityStatus) => void;
  setServiceable: (village: Village) => Promise<void>;
  setNotServiceable: () => void;
  setSavedAddresses: (addresses: Address[]) => void;
  setSelectedAddressId: (id: string | null) => Promise<void>;
  clearLocation: () => Promise<void>;
  hasServiceableLocation: () => boolean;
}

type LocationStore = LocationState & LocationActions;

const initialState: LocationState = {
  status: 'idle',
  serviceableVillage: null,
  selectedAddressId: null,
  savedAddresses: [],
  hydrated: false,
};

export const useLocationStore = create<LocationStore>((set, get) => ({
  ...initialState,

  hydrate: async () => {
    const [village, selectedId] = await Promise.all([
      StoredPrefs.getCustomData<Village>(StorageKeys.SERVICEABLE_VILLAGE),
      StoredPrefs.getCustomData<string>(StorageKeys.SELECTED_ADDRESS_ID),
    ]);
    set({
      serviceableVillage: village ?? null,
      selectedAddressId: selectedId ?? null,
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

  setSelectedAddressId: async (id) => {
    set({ selectedAddressId: id });
    if (id) await StoredPrefs.setCustomData(StorageKeys.SELECTED_ADDRESS_ID, id);
    else await StoredPrefs.removeCustomData(StorageKeys.SELECTED_ADDRESS_ID);
  },

  clearLocation: async () => {
    set({ serviceableVillage: null, status: 'idle', selectedAddressId: null, savedAddresses: [] });
    await Promise.all([
      StoredPrefs.removeCustomData(StorageKeys.SERVICEABLE_VILLAGE),
      StoredPrefs.removeCustomData(StorageKeys.SELECTED_ADDRESS_ID),
    ]);
  },

  hasServiceableLocation: () => get().serviceableVillage !== null,
}));
