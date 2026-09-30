// src/features/location/views/useRecenterOnFocus.ts
//
// Android ignores animateToRegion on a MapView that is covered by another
// screen (e.g. the search screen it just popped back from), so a village picked
// there set the pin state but left the camera behind. Re-apply the current
// region once the screen is focused again and its transition has finished.
// Idempotent: `region` already tracks the camera, so a redundant call is a no-op.

import { useCallback, useEffect, useRef, type RefObject } from 'react';
import { useScreenFocused } from '@/src/shared/hooks/useScreenActive';
import type MapView from 'react-native-maps';
import type { Region } from 'react-native-maps';

const TRANSITION_MS = 400;

export function useRecenterOnFocus(
  mapRef: RefObject<MapView | null>,
  region: Region | null,
  enabled = true,
) {
  const focused = useScreenFocused();
  const latest = useRef(region);
  useEffect(() => { latest.current = region; }, [region]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancel = useCallback(() => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  useEffect(() => {
    if (!focused || !enabled) return;
    timer.current = setTimeout(() => {
      timer.current = null;
      const current = latest.current;
      if (!current || !mapRef.current) return;
      mapRef.current.animateToRegion(current, 0);
    }, TRANSITION_MS);
    return cancel;
  }, [focused, enabled, mapRef, cancel]);

  // A real gesture takes precedence over the delayed focus correction.
  return cancel;
}
