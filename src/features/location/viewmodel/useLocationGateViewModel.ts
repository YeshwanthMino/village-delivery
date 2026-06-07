// src/features/location/viewmodel/useLocationGateViewModel.ts

import { useCallback, useState } from 'react';
import { Linking } from 'react-native';
import { useLocationStore } from '@/src/core/store/useLocationStore';
import { LocationService, PermissionState } from '../data/LocationService';
import { findByLocation } from '../data/locationApi';

export function useLocationGateViewModel() {
  const status = useLocationStore((s) => s.status);
  const village = useLocationStore((s) => s.serviceableVillage);
  const setStatus = useLocationStore((s) => s.setStatus);
  const setServiceable = useLocationStore((s) => s.setServiceable);
  const setNotServiceable = useLocationStore((s) => s.setNotServiceable);

  const [permission, setPermission] = useState<PermissionState>('undetermined');

  /** Full flow: permission → GPS → find-by-location → status. */
  const detectLocation = useCallback(async () => {
    setStatus('locating');
    try {
      const granted = await LocationService.requestPermission();
      setPermission(granted ? 'granted' : 'denied');
      if (!granted) {
        setStatus('idle');
        return;
      }

      const coords = await LocationService.getCurrentPosition();
      setStatus('checking');

      const result = await findByLocation(coords);
      if (result.serviceable) {
        await setServiceable(
          result.village ?? { id: 'unknown', name: 'Your location', latitude: coords.latitude, longitude: coords.longitude },
        );
      } else {
        setNotServiceable();
      }
    } catch {
      // Network / 5xx / GPS failure → retryable error state.
      setStatus('error');
    }
  }, [setStatus, setServiceable, setNotServiceable]);

  const openSettings = useCallback(() => {
    Linking.openSettings().catch(() => {});
  }, []);

  const retry = useCallback(() => {
    setStatus('idle');
    void detectLocation();
  }, [setStatus, detectLocation]);

  return { status, village, permission, detectLocation, openSettings, retry };
}
