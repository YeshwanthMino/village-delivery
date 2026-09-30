// src/features/location/lifecycle/useLocationLifecycle.ts
//
// The single AppState listener for location. Mounted once (AppScreen). On
// returning to the foreground it re-reads permission and auto-detects when the
// user has just granted permission or enabled GPS in Settings — but never when a
// village is already set. Guarded by the store's in-flight promise, so it can't
// double-fire with another detect.

import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useLocationStore } from '@/src/core/store/useLocationStore';
import { LocationService } from '@/src/features/location/data/LocationService';

export function useLocationLifecycle(allowAutoDetect = true) {
  const allowed = useRef(allowAutoDetect);
  const request = useRef<AbortController | null>(null);
  useEffect(() => {
    allowed.current = allowAutoDetect;
    if (!allowAutoDetect) request.current?.abort();
  }, [allowAutoDetect]);
  useEffect(() => {
    let disposed = false;
    let generation = 0;
    let servicesEnabled: boolean | null = null;
    // Seed the permission state once at startup.
    void useLocationStore.getState().refreshPermission().catch(() => {});
    void LocationService.hasServicesEnabled().then((enabled) => {
      if (!disposed && generation === 0) servicesEnabled = enabled;
    }).catch(() => {});

    const sub = AppState.addEventListener('change', async (state) => {
      const token = ++generation;
      if (state !== 'active') {
        request.current?.abort();
        return;
      }
      const stale = () => disposed || token !== generation;
      const store = useLocationStore.getState();
      const prevPerm = store.permission;
      try {
        const [perm, enabled] = await Promise.all([
          store.refreshPermission(), LocationService.hasServicesEnabled(),
        ]);
        if (stale()) return;
        const justEnabled = servicesEnabled === false && enabled;
        servicesEnabled = enabled;
        // A map/search flow owns its pending choice until Confirm. The global
        // listener must not auto-commit GPS while that flow is showing.
        if (!allowed.current || useLocationStore.getState().serviceableVillage) return;
        if (perm === 'granted' && (prevPerm !== 'granted' || justEnabled)) {
          request.current = new AbortController();
          void store.detectCurrentLocation(request.current.signal);
        }
      } catch {
        // Foreground permission/service reads are best-effort; the picker
        // surfaces a retryable error when the user explicitly requests GPS.
      }
    });

    return () => {
      disposed = true;
      request.current?.abort();
      sub.remove();
    };
  }, []);
}
