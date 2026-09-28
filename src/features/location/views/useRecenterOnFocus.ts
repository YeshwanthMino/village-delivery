// src/features/location/views/useRecenterOnFocus.ts
//
// Android ignores animateToRegion on a MapView that is covered by another
// screen (e.g. the search screen it just popped back from), so a village picked
// there set the pin state but left the camera behind. Re-apply the current
// region once the screen is focused again and its transition has finished.
// Idempotent: `region` already tracks the camera, so a redundant call is a no-op.

import { useCallback, type RefObject } from 'react';
import { useFocusEffect } from 'expo-router';
import type MapView from 'react-native-maps';
import type { Region } from 'react-native-maps';

const TRANSITION_MS = 400;

export function useRecenterOnFocus(
  mapRef: RefObject<MapView | null>,
  region: Region | null,
  /** Called right before animating so the resulting settle event can be ignored. */
  beforeAnimate: () => void,
  enabled = true,
) {
  const lat = region?.latitude;
  const lng = region?.longitude;

  useFocusEffect(
    useCallback(() => {
      if (!enabled || !region || !mapRef.current) return undefined;
      const timer = setTimeout(() => {
        if (!mapRef.current) return;
        beforeAnimate();
        mapRef.current.animateToRegion(region, 0);
      }, TRANSITION_MS);
      return () => clearTimeout(timer);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [enabled, lat, lng]),
  );
}
