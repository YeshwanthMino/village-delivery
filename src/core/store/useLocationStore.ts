// src/core/store/useLocationStore.ts
//
// Minimal temporary location store to unblock home layout during location feature rebuild.
// Provides storeId for page-layout API calls. Full location feature (permission, sheets,
// serviceability) will be rebuilt from the Village Delivery design.

import { create } from 'zustand';

interface LocationState {
  serviceableVillage: { id: string; name: string; storeId?: string } | null;
  setServiceable: (village: { id: string; name: string; storeId?: string }) => void;
}

export const useLocationStore = create<LocationState>((set) => ({
  serviceableVillage: null,
  setServiceable: (village) => set({ serviceableVillage: village }),
}));
