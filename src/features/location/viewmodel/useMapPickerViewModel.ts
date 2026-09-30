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
import { useScreenFocused } from '@/src/shared/hooks/useScreenActive';

export type PinState = 'resolving' | 'serviceable' | 'not_serviceable' | 'error';

const DEBOUNCE_MS = 450;
const DEFAULT_DELTA = { latitudeDelta: 0.01, longitudeDelta: 0.01 };
// Fallback region used when there is no prior village and no GPS fix.
export const DEFAULT_REGION: Region = { latitude: 13.360002, longitude: 79.028059, ...DEFAULT_DELTA };

function regionFor(coords: LatLng): Region {
  return { latitude: coords.latitude, longitude: coords.longitude, ...DEFAULT_DELTA };
}

export function useMapPickerViewModel(enabled = true) {
  const screenFocused = useScreenFocused();
  const focused = screenFocused && enabled;
  const setServiceable = useLocationStore((s) => s.setServiceable);
  const addRecent = useLocationStore((s) => s.addRecent);
  const savedVillage = useLocationStore((s) => s.serviceableVillage);
  const foregroundPermission = useLocationStore((s) => s.permission);
  const recordPermissionResult = useLocationStore((s) => s.recordPermissionResult);
  const dismissBlockedPrompt = useLocationStore((s) => s.dismissBlockedPrompt);

  const [region, setRegion] = useState<Region | null>(null);
  const [pinState, setPinState] = useState<PinState>('resolving');
  const [primary, setPrimary] = useState('');
  const [secondary, setSecondary] = useState<string | null>(null);
  const [village, setVillage] = useState<Village | null>(null);
  const [detectingGps, setDetectingGps] = useState(false);
  const [blocked, setBlocked] = useState(false);

  const seq = useRef(0);
  const resolvedSeq = useRef<number | null>(null);
  // Bumped whenever the user explicitly picks a place (moveTo). A GPS fix that
  // was requested before the pick and lands after it must not move the camera
  // back, so detect flows compare against the value they started with.
  const pickSeq = useRef(0);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(true);
  const pendingResolve = useRef<AbortController | null>(null);
  const pendingGps = useRef<AbortController | null>(null);

  useEffect(() => {
    mounted.current = focused;
    // These are request counters, not native node refs: invalidate their latest
    // values on cleanup so every request started during this focus is stale.
    const resolveSequence = seq;
    const pickSequence = pickSeq;
    return () => {
      mounted.current = false;
      resolveSequence.current++;
      pickSequence.current++;
      pendingResolve.current?.abort();
      pendingGps.current?.abort();
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [focused]);

  // Resolve coords → serviceability. Drops its result if a newer settle started.
  const resolve = useCallback(async (coords: LatLng) => {
    if (!mounted.current) return;
    pendingResolve.current?.abort();
    const controller = new AbortController();
    pendingResolve.current = controller;
    const token = ++seq.current;
    setPinState('resolving');
    try {
      const result = await findByLocation(coords, controller.signal);
      if (token !== seq.current || !mounted.current) return;
      if (result.serviceable && result.village) {
        resolvedSeq.current = token;
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

  // Invalidate as soon as a gesture begins, not only once it settles: Confirm
  // must never commit the old center while the native map is already moving.
  const onRegionMoving = useCallback(() => {
    if (!mounted.current) return;
    seq.current++;
    pickSeq.current++;
    pendingGps.current?.abort();
    pendingGps.current = null;
    setDetectingGps(false);
    pendingResolve.current?.abort();
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = null;
    setPinState('resolving');
  }, []);

  // Called on every user onRegionChangeComplete. Debounced so rapid pans coalesce.
  const onRegionSettled = useCallback((next: Region) => {
    if (!mounted.current) return;
    onRegionMoving();
    setRegion(next);
    debounce.current = setTimeout(() => {
      debounce.current = null;
      void resolve({ latitude: next.latitude, longitude: next.longitude });
    }, DEBOUNCE_MS);
  }, [resolve, onRegionMoving]);

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

  // A pushed search screen leaves the map mounted. Cancel its work on blur,
  // then resolve the preserved center when returning without asking for GPS.
  const wasFocused = useRef(focused);
  const latestRegion = useRef(region);
  useEffect(() => { latestRegion.current = region; }, [region]);
  useEffect(() => {
    if (!focused) setDetectingGps(false);
    if (focused && !wasFocused.current) {
      if (latestRegion.current) void resolve(latestRegion.current);
      else fallbackRegion();
    }
    wasFocused.current = focused;
  }, [focused, resolve, fallbackRegion]);

  // Initial camera: auto-detect GPS, fall back to saved village, then default.
  const initialDetect = useCallback(async () => {
    if (!mounted.current) return;
    if (pendingGps.current && !pendingGps.current.signal.aborted) return;
    onRegionMoving();
    const controller = new AbortController();
    pendingGps.current = controller;
    const startedAt = ++pickSeq.current;
    const superseded = () => pickSeq.current !== startedAt;
    setDetectingGps(true);
    try {
      const permission = await LocationService.requestPermission();
      if (!mounted.current || superseded()) return;
      recordPermissionResult(permission);
      if (!permission.granted) {
        setBlocked(!permission.canAskAgain);
        fallbackRegion();
        return;
      }
      setBlocked(false);
      const fix = await LocationService.getCurrentPosition(controller.signal);
      if (!mounted.current || superseded()) return;
      setRegion(regionFor(fix));
      void resolve(fix);
    } catch {
      if (!mounted.current || superseded()) return;
      fallbackRegion();
    } finally {
      if (pendingGps.current === controller) pendingGps.current = null;
      if (mounted.current && !superseded()) setDetectingGps(false);
    }
  }, [resolve, fallbackRegion, onRegionMoving, recordPermissionResult]);

  // "Use my current location" pill. Mirrors initialDetect: it resolves
  // serviceability DIRECTLY rather than relying on the camera settle — that
  // settle never fires when the GPS fix equals the current center (no camera
  // move) or when the map isn't emitting region events. Returns the region so
  // the screen can recenter; the programmatic move's settle is suppressed.
  const requestCurrentLocation = useCallback(async (): Promise<Region | null> => {
    if (!mounted.current) return null;
    if (pendingGps.current && !pendingGps.current.signal.aborted) return null;
    onRegionMoving();
    const controller = new AbortController();
    pendingGps.current = controller;
    const startedAt = ++pickSeq.current;
    setDetectingGps(true);
    try {
      const permission = await LocationService.requestPermission();
      if (!mounted.current || pickSeq.current !== startedAt) return null;
      recordPermissionResult(permission);
      if (!permission.granted) {
        setBlocked(!permission.canAskAgain);
        setPinState('error');
        return null;
      }
      setBlocked(false);
      const fix = await LocationService.getCurrentPosition(controller.signal);
      if (!mounted.current || pickSeq.current !== startedAt) return null;
      const r = regionFor(fix);
      setRegion(r);
      void resolve(fix);
      return r;
    } catch {
      if (mounted.current && pickSeq.current === startedAt) setPinState('error');
      return null;
    } finally {
      if (pendingGps.current === controller) pendingGps.current = null;
      if (mounted.current && pickSeq.current === startedAt) setDetectingGps(false);
    }
  }, [resolve, onRegionMoving, recordPermissionResult]);

  // AppScreen refreshes permission when the app returns from Settings. Clear
  // the map's local guidance and retry GPS without leaving an obsolete sheet
  // above the map after iOS permission becomes granted.
  const previousForegroundPermission = useRef(foregroundPermission);
  useEffect(() => {
    const becameGranted = previousForegroundPermission.current !== 'granted' && foregroundPermission === 'granted';
    previousForegroundPermission.current = foregroundPermission;
    if (!focused || !blocked || !becameGranted) return;
    setBlocked(false);
    void requestCurrentLocation();
  }, [focused, blocked, foregroundPermission, requestCurrentLocation]);

  // Point the camera at an explicitly chosen place (a village picked in the
  // search screen). Mirrors useCurrentLocation: resolves serviceability
  // DIRECTLY rather than waiting on the camera settle, which never fires when
  // the target equals the current center. setRegion drives the camera through
  // the screen's animate effect, whose settle is suppressed.
  const moveTo = useCallback((coords: LatLng) => {
    pickSeq.current += 1;
    pendingGps.current?.abort();
    setDetectingGps(false);
    // Drop a pending settle-resolve for the previous camera position, or it
    // would fire after this and overwrite the pin state for the wrong place.
    if (debounce.current) clearTimeout(debounce.current);
    setRegion(regionFor(coords));
    void resolve(coords);
  }, [resolve]);

  // Re-run resolve for the current center (error-state Retry).
  const retry = useCallback(() => {
    if (region) void resolve({ latitude: region.latitude, longitude: region.longitude });
  }, [region, resolve]);

  // Commit the confirmed serviceable village to the global store.
  const isCurrentPin = useCallback(() => mounted.current && resolvedSeq.current === seq.current, []);
  const confirm = useCallback(async (): Promise<boolean> => {
    if (!isCurrentPin() || pinState !== 'serviceable' || !village || !region) return false;
    const lat = region.latitude;
    const lng = region.longitude;
    await setServiceable({ ...village, latitude: lat, longitude: lng });
    if (village.storeId) {
      await addRecent({
        villageId: village.id,
        storeId: village.storeId,
        branchId: village.branchId,
        villageName: village.name,
        latitude: lat,
        longitude: lng,
        label: village.name,
        savedAt: Date.now(),
      });
    }
    return true;
  }, [pinState, village, region, setServiceable, addRecent, isCurrentPin]);

  const openSettings = useCallback(() => {
    Linking.openSettings().catch(() => {});
  }, []);

  const dismissBlocked = useCallback(() => {
    setBlocked(false);
    dismissBlockedPrompt();
  }, [dismissBlockedPrompt]);

  return {
    region,
    pinState,
    primary,
    secondary,
    village,
    detectingGps,
    blocked,
    initialDetect,
    onRegionMoving,
    onRegionSettled,
    useCurrentLocation: requestCurrentLocation,
    moveTo,
    retry,
    confirm,
    isCurrentPin,
    openSettings,
    dismissBlocked,
  };
}
