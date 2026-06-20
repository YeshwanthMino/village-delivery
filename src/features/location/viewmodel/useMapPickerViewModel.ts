// src/features/location/viewmodel/useMapPickerViewModel.ts
//
// Ephemeral state + orchestration for the full-screen map picker. Owns the
// camera region, resolved address labels and resolve status. Calls
// findByLocation (debounced) on every camera settle, guards against stale
// responses with a sequence token, and commits to useLocationStore only on
// Confirm. Camera churn stays out of the global store by design.

import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking } from 'react-native';
import type { Region } from 'react-native-maps';
import { useLocationStore } from '@/src/core/store/useLocationStore';
import { LocationService } from '../data/LocationService';
import { findByLocation } from '../data/locationApi';
import { LatLng, Village } from '../domain/models';

export type PinState = 'resolving' | 'serviceable' | 'not_serviceable' | 'error';

const DEBOUNCE_MS = 450;
const DEFAULT_DELTA = { latitudeDelta: 0.01, longitudeDelta: 0.01 };
// Fallback region used when there is no prior village and no GPS fix.
export const DEFAULT_REGION: Region = { latitude: 13.360002, longitude: 79.028059, ...DEFAULT_DELTA };

function regionFor(coords: LatLng): Region {
  return { latitude: coords.latitude, longitude: coords.longitude, ...DEFAULT_DELTA };
}

export function useMapPickerViewModel() {
  const setServiceable = useLocationStore((s) => s.setServiceable);
  const addRecent = useLocationStore((s) => s.addRecent);
  const savedVillage = useLocationStore((s) => s.serviceableVillage);

  const [region, setRegion] = useState<Region | null>(null);
  const [pinState, setPinState] = useState<PinState>('resolving');
  const [primary, setPrimary] = useState('');
  const [secondary, setSecondary] = useState<string | null>(null);
  const [village, setVillage] = useState<Village | null>(null);
  const [detectingGps, setDetectingGps] = useState(false);
  const [blocked, setBlocked] = useState(false);

  const seq = useRef(0);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, []);

  // Resolve coords → serviceability. Drops its result if a newer settle started.
  const resolve = useCallback(async (coords: LatLng) => {
    const token = ++seq.current;
    setPinState('resolving');
    try {
      const result = await findByLocation(coords);
      if (token !== seq.current || !mounted.current) return;
      if (result.serviceable && result.village) {
        setVillage(result.village);
        setPrimary(result.village.name);
        setSecondary(result.village.secondaryName ?? null);
        setPinState('serviceable');
      } else {
        setVillage(null);
        setPinState('not_serviceable');
      }
    } catch {
      if (token !== seq.current || !mounted.current) return;
      setVillage(null);
      setPinState('error');
    }
  }, []);

  // Called on every onRegionChangeComplete. Debounced so rapid pans coalesce.
  const onRegionSettled = useCallback((next: Region) => {
    setRegion(next);
    setPinState('resolving');
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      void resolve({ latitude: next.latitude, longitude: next.longitude });
    }, DEBOUNCE_MS);
  }, [resolve]);

  const fallbackRegion = useCallback(() => {
    if (!mounted.current) return;
    if (savedVillage?.latitude != null && savedVillage?.longitude != null) {
      const coords = { latitude: savedVillage.latitude, longitude: savedVillage.longitude };
      setRegion(regionFor(coords));
      void resolve(coords);
    } else {
      setRegion(DEFAULT_REGION);
      void resolve({ latitude: DEFAULT_REGION.latitude, longitude: DEFAULT_REGION.longitude });
    }
  }, [resolve, savedVillage]);

  // Initial camera: auto-detect GPS, fall back to saved village, then default.
  const initialDetect = useCallback(async () => {
    setDetectingGps(true);
    try {
      const perm = await LocationService.getPermissionState();
      if (perm !== 'granted') {
        const res = await LocationService.requestPermission();
        if (!res.granted) {
          if (!mounted.current) return;
          setBlocked(!res.canAskAgain);
          fallbackRegion();
          return;
        }
      }
      const fix = await LocationService.getCurrentPosition();
      if (!mounted.current) return;
      setRegion(regionFor(fix));
      void resolve(fix);
    } catch {
      if (!mounted.current) return;
      fallbackRegion();
    } finally {
      if (mounted.current) setDetectingGps(false);
    }
  }, [resolve, fallbackRegion]);

  // "Use my current location" pill. Returns the GPS region so the screen can
  // animate the camera to it; the resulting settle drives the resolve path.
  const useCurrentLocation = useCallback(async (): Promise<Region | null> => {
    setDetectingGps(true);
    try {
      const perm = await LocationService.getPermissionState();
      if (perm !== 'granted') {
        const res = await LocationService.requestPermission();
        if (!res.granted) {
          if (mounted.current) setBlocked(!res.canAskAgain);
          return null;
        }
      }
      const fix = await LocationService.getCurrentPosition();
      if (!mounted.current) return null;
      return regionFor(fix);
    } catch {
      return null;
    } finally {
      if (mounted.current) setDetectingGps(false);
    }
  }, []);

  // Re-run resolve for the current center (error-state Retry).
  const retry = useCallback(() => {
    if (region) void resolve({ latitude: region.latitude, longitude: region.longitude });
  }, [region, resolve]);

  // Commit the confirmed serviceable village to the global store.
  const confirm = useCallback(async (): Promise<boolean> => {
    if (pinState !== 'serviceable' || !village || !region) return false;
    const lat = region.latitude;
    const lng = region.longitude;
    await setServiceable({ ...village, latitude: lat, longitude: lng });
    if (village.storeId) {
      await addRecent({
        storeId: village.storeId,
        villageName: village.name,
        latitude: lat,
        longitude: lng,
        label: village.name,
        savedAt: Date.now(),
      });
    }
    return true;
  }, [pinState, village, region, setServiceable, addRecent]);

  const openSettings = useCallback(() => {
    Linking.openSettings().catch(() => {});
  }, []);

  const dismissBlocked = useCallback(() => setBlocked(false), []);

  return {
    region,
    pinState,
    primary,
    secondary,
    detectingGps,
    blocked,
    initialDetect,
    onRegionSettled,
    useCurrentLocation,
    retry,
    confirm,
    openSettings,
    dismissBlocked,
  };
}
