// src/features/location/viewmodel/useLocationViewModel.ts
//
// Orchestrates the Zepto/Blinkit-style location flow: permission → GPS →
// find-by-location → serviceable village, plus recent/saved/search re-selection
// and the permanently-denied → Settings recovery path.

import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking } from 'react-native';
import { useLocationStore } from '@/src/core/store/useLocationStore';
import { Address, LatLng, RecentLocation, Village } from '../domain/models';
import { LocationService, PermissionState } from '../data/LocationService';
import { findByLocation } from '../data/locationApi';

export function useLocationViewModel() {
  const status = useLocationStore((s) => s.status);
  const village = useLocationStore((s) => s.serviceableVillage);
  const recentLocations = useLocationStore((s) => s.recentLocations);
  const setStatus = useLocationStore((s) => s.setStatus);
  const setServiceable = useLocationStore((s) => s.setServiceable);
  const setNotServiceable = useLocationStore((s) => s.setNotServiceable);
  const addRecent = useLocationStore((s) => s.addRecent);

  const [permission, setPermission] = useState<PermissionState>('undetermined');
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    void LocationService.getPermissionState().then(setPermission);
  }, []);

  /** Resolve coords → serviceability; on success persist village + recent. */
  const resolveCoords = useCallback(
    async (coords: LatLng, label?: string): Promise<boolean> => {
      setStatus('checking');
      try {
        const result = await findByLocation(coords);
        if (result.serviceable && result.village) {
          const v = result.village;
          await setServiceable(v);
          if (v.storeId) {
            const recent: RecentLocation = {
              storeId: v.storeId,
              villageName: v.name,
              latitude: v.latitude ?? coords.latitude,
              longitude: v.longitude ?? coords.longitude,
              label: label ?? v.name,
              savedAt: Date.now(),
            };
            await addRecent(recent);
          }
          return true;
        }
        setNotServiceable();
        return false;
      } catch {
        setStatus('error');
        return false;
      }
    },
    [setStatus, setServiceable, setNotServiceable, addRecent],
  );

  /** Permission → GPS → resolve. */
  const detectCurrentLocation = useCallback(async (): Promise<boolean> => {
    setStatus('locating');

    let granted = (await LocationService.getPermissionState()) === 'granted';
    if (!granted) {
      const res = await LocationService.requestPermission();
      granted = res.granted;
      setPermission(res.granted ? 'granted' : 'denied');
      if (!granted) {
        setStatus('idle');
        if (!res.canAskAgain) setBlocked(true); // permanently denied → Settings
        return false;
      }
    } else {
      setPermission('granted');
    }

    try {
      const coords = await LocationService.getCurrentPosition();
      return await resolveCoords(coords);
    } catch {
      setStatus('error');
      return false;
    }
  }, [setStatus, resolveCoords]);

  /** Resolve a free-text address via geocoding. */
  const searchLocation = useCallback(
    async (query: string): Promise<boolean> => {
      const q = query.trim();
      if (!q) return false;
      setStatus('locating');
      try {
        const coords = await LocationService.geocode(q);
        if (!coords) {
          setStatus('idle');
          return false;
        }
        return await resolveCoords(coords, q);
      } catch {
        setStatus('error');
        return false;
      }
    },
    [setStatus, resolveCoords],
  );

  /** Resolve a saved address by its stored coordinates. */
  const selectAddress = useCallback(
    (address: Address): Promise<boolean> => {
      if (address.latitude == null || address.longitude == null) return Promise.resolve(false);
      const label = [address.addressLine1, address.villageName].filter(Boolean).join(', ');
      return resolveCoords({ latitude: address.latitude, longitude: address.longitude }, label);
    },
    [resolveCoords],
  );

  /** Re-select a previously-resolved location instantly (no find-by-location). */
  const selectRecent = useCallback(
    async (r: RecentLocation) => {
      const v: Village = {
        id: r.storeId,
        name: r.villageName,
        storeId: r.storeId,
        latitude: r.latitude,
        longitude: r.longitude,
      };
      await setServiceable(v);
      await addRecent({ ...r, savedAt: Date.now() });
    },
    [setServiceable, addRecent],
  );

  const openSettings = useCallback(() => {
    Linking.openSettings().catch(() => {});
  }, []);

  const dismissBlocked = useCallback(() => setBlocked(false), []);

  const retry = useCallback(() => {
    setStatus('idle');
    void detectCurrentLocation();
  }, [setStatus, detectCurrentLocation]);

  // While the blocked sheet is open, re-check permission when the app returns to
  // the foreground (user may have toggled it in Settings) and auto-detect.
  const detectRef = useRef(detectCurrentLocation);
  detectRef.current = detectCurrentLocation;
  useEffect(() => {
    if (!blocked) return;
    const sub = AppState.addEventListener('change', async (state) => {
      if (state !== 'active') return;
      if ((await LocationService.getPermissionState()) === 'granted') {
        setPermission('granted');
        setBlocked(false);
        void detectRef.current();
      }
    });
    return () => sub.remove();
  }, [blocked]);

  return {
    status,
    village,
    permission,
    blocked,
    recentLocations,
    detecting: status === 'locating' || status === 'checking',
    detectCurrentLocation,
    searchLocation,
    selectAddress,
    selectRecent,
    openSettings,
    dismissBlocked,
    retry,
  };
}
