// src/features/location/viewmodel/useLocationViewModel.ts
//
// Thin adapter over useLocationStore. All orchestration + race guards live in
// the store; this hook only selects state and exposes the actions the views use.
// Permission/blocked are store state (single source of truth), so every consumer
// stays in sync and there are no per-instance AppState listeners.

import { useCallback, useState } from 'react';
import { Linking } from 'react-native';
import { useLocationStore } from '@/src/core/store/useLocationStore';

export function useLocationViewModel() {
  const status = useLocationStore((s) => s.status);
  const village = useLocationStore((s) => s.serviceableVillage);
  const permission = useLocationStore((s) => s.permission);
  const storeBlocked = useLocationStore((s) => s.blocked);
  const lastError = useLocationStore((s) => s.lastError);
  const detecting = useLocationStore((s) => s.detecting);
  const recentLocations = useLocationStore((s) => s.recentLocations);

  const detectCurrentLocation = useLocationStore((s) => s.detectCurrentLocation);
  const searchLocation = useLocationStore((s) => s.searchLocation);
  const selectAddress = useLocationStore((s) => s.selectAddress);
  const selectRecent = useLocationStore((s) => s.selectRecent);

  // Local-only flag so the user can dismiss the "blocked → Settings" sheet
  // without changing the underlying OS permission.
  const [blockedDismissed, setBlockedDismissed] = useState(false);
  const blocked = storeBlocked && !blockedDismissed;

  const openSettings = useCallback(() => {
    Linking.openSettings().catch(() => {});
  }, []);

  const dismissBlocked = useCallback(() => setBlockedDismissed(true), []);

  const retry = useCallback(() => {
    setBlockedDismissed(false);
    void detectCurrentLocation();
  }, [detectCurrentLocation]);

  return {
    status,
    village,
    permission,
    blocked,
    lastError,
    recentLocations,
    detecting,
    detectCurrentLocation,
    searchLocation,
    selectAddress,
    selectRecent,
    openSettings,
    dismissBlocked,
    retry,
  };
}
