// src/features/location/viewmodel/useLocationViewModel.ts
//
// Adapter over useLocationStore. The store owns orchestration + race guards;
// this hook cancels a view's GPS request when it closes or loses focus.
// Permission/blocked are store state (single source of truth), so every consumer
// stays in sync and there are no per-instance AppState listeners.

import { useCallback, useEffect, useRef } from 'react';
import { Linking } from 'react-native';
import { useLocationStore } from '@/src/core/store/useLocationStore';
import { useScreenFocused } from '@/src/shared/hooks/useScreenActive';

export function useLocationViewModel(enabled = true) {
  const focused = useScreenFocused();
  const active = focused && enabled;
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => { request.current?.abort(); }, [active]);
  const status = useLocationStore((s) => s.status);
  const village = useLocationStore((s) => s.serviceableVillage);
  const permission = useLocationStore((s) => s.permission);
  const storeBlocked = useLocationStore((s) => s.blocked);
  const blockedPromptDismissed = useLocationStore((s) => s.blockedPromptDismissed);
  const lastError = useLocationStore((s) => s.lastError);
  const detecting = useLocationStore((s) => s.detecting);
  const recentLocations = useLocationStore((s) => s.recentLocations);

  const detect = useLocationStore((s) => s.detectCurrentLocation);
  const showBlockedPrompt = useLocationStore((s) => s.showBlockedPrompt);
  const detectCurrentLocation = useCallback(() => {
    if (!active) return Promise.resolve(false);
    showBlockedPrompt();
    if (!request.current || request.current.signal.aborted) request.current = new AbortController();
    return detect(request.current.signal);
  }, [active, detect, showBlockedPrompt]);
  const searchLocation = useLocationStore((s) => s.searchLocation);
  const selectAddress = useLocationStore((s) => s.selectAddress);
  const selectRecent = useLocationStore((s) => s.selectRecent);
  const selectVillage = useLocationStore((s) => s.selectVillage);

  // Settings guidance is suppressed across sheets/screens after Cancel. A
  // new user-initiated GPS attempt above makes it eligible again.
  const blocked = storeBlocked && !blockedPromptDismissed;

  const openSettings = useCallback(() => {
    Linking.openSettings().catch(() => {});
  }, []);

  const dismissBlocked = useLocationStore((s) => s.dismissBlockedPrompt);

  const retry = useCallback(() => {
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
    selectVillage,
    openSettings,
    dismissBlocked,
    retry,
  };
}
