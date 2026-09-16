// src/features/location/lifecycle/useLocationLifecycle.ts
//
// The single AppState listener for location. Mounted once (AppScreen). On
// returning to the foreground it re-reads permission and auto-detects when the
// user has just granted permission or enabled GPS in Settings — but never when a
// village is already set. Guarded by the store's in-flight promise, so it can't
// double-fire with another detect.

import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useLocationStore } from '@/src/core/store/useLocationStore';
import { LocationService } from '@/src/features/location/data/LocationService';

export function useLocationLifecycle() {
  useEffect(() => {
    // Seed the permission state once at startup.
    void useLocationStore.getState().refreshPermission();

    const sub = AppState.addEventListener('change', async (state) => {
      if (state !== 'active') return;
      const store = useLocationStore.getState();
      const prevPerm = store.permission;
      const perm = await store.refreshPermission();
      if (useLocationStore.getState().serviceableVillage) return; // already set

      if (prevPerm !== 'granted' && perm === 'granted') {
        void store.detectCurrentLocation(); // returned from Settings with permission
        return;
      }
      if (perm === 'granted' && (await LocationService.hasServicesEnabled())) {
        void store.detectCurrentLocation(); // returned after enabling GPS
      }
    });

    return () => sub.remove();
  }, []);
}
