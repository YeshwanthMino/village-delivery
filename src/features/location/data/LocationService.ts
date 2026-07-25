// src/features/location/data/LocationService.ts

import * as Location from 'expo-location';
import { LatLng } from '../domain/models';
import { logger } from '@/src/base/services/logger';

export type PermissionState = 'granted' | 'denied' | 'undetermined';

/**
 * One-shot read of the current position, rejected after `ms`. Uses
 * getCurrentPositionAsync (not a watch): it reads the CURRENT location, so a
 * static fix (e.g. an emulator-set location that never "changes", which a watch
 * would never emit) is returned immediately.
 */
function firstFix(ms: number): Promise<LatLng> {
  return new Promise<LatLng>((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      logger.debug('[LOC] firstFix TIMEOUT after', ms, 'ms');
      reject(new Error('LOCATION_TIMEOUT'));
    }, ms);

    logger.debug('[LOC] firstFix: calling getCurrentPositionAsync');
    Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
      .then((pos) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        logger.debug('[LOC] firstFix: got', pos?.coords?.latitude, pos?.coords?.longitude);
        resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      })
      .catch((err) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        logger.debug('[LOC] firstFix: getCurrentPositionAsync ERROR', err?.message ?? err);
        reject(err);
      });
  });
}

export interface PermissionResult {
  granted: boolean;
  /** False once the OS will no longer show the system dialog (permanently denied). */
  canAskAgain: boolean;
}

export const LocationService = {
  async getPermissionState(): Promise<PermissionState> {
    const { status } = await Location.getForegroundPermissionsAsync();
    return status as PermissionState;
  },

  /** True when device location services (GPS) are on. */
  async hasServicesEnabled(): Promise<boolean> {
    return Location.hasServicesEnabledAsync().catch(() => false);
  },

  /**
   * Request permission. When already permanently denied the OS resolves immediately
   * without showing a dialog, so the caller can branch on `canAskAgain`.
   */
  async requestPermission(): Promise<PermissionResult> {
    const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
    return { granted: status === 'granted', canAskAgain };
  },

  /**
   * Read the current position. Core Location can transiently fail to obtain a
   * fix (kCLErrorLocationUnknown / "Cannot obtain current location") on a cold
   * first request — common on the simulator and on devices right after launch.
   * So: try a fresh fix, retry once, and fall back to the last known position
   * before giving up. Throws only when no position can be obtained at all.
   */
  async getCurrentPosition(): Promise<LatLng> {
    // Generous hang guard. A cold GPS fix right after the user enables location
    // can take 15-25s, so don't fail too early.
    const FIX_TIMEOUT_MS = 20000;

    logger.debug('[LOC] getCurrentPosition: start');
    const servicesOn = await Location.hasServicesEnabledAsync().catch(() => null);
    logger.debug('[LOC] hasServicesEnabled =', servicesOn);

    // Fast path: a recent cached fix returns instantly (no GPS warm-up).
    try {
      const cached = await Location.getLastKnownPositionAsync({ maxAge: 5 * 60 * 1000 });
      logger.debug('[LOC] cached last-known =', cached?.coords?.latitude, cached?.coords?.longitude);
      if (cached) {
        return { latitude: cached.coords.latitude, longitude: cached.coords.longitude };
      }
    } catch (e: any) {
      logger.debug('[LOC] getLastKnownPositionAsync(maxAge) ERROR', e?.message ?? e);
      // ignore — fall through to a fresh fix
    }

    // Make sure device location is actually ON. On Android this shows the system
    // "Location Accuracy" dialog and resolves once the user enables it; on iOS it
    // isn't available and throws, so we ignore it there.
    try {
      logger.debug('[LOC] enableNetworkProviderAsync: calling');
      await Location.enableNetworkProviderAsync();
      logger.debug('[LOC] enableNetworkProviderAsync: resolved (enabled)');
    } catch (e: any) {
      logger.debug('[LOC] enableNetworkProviderAsync ERROR', e?.message ?? e);
      // ignore — not available on iOS / user dismissed; we still try for a fix
    }

    // Resolve on the FIRST position emission. watchPositionAsync surfaces an
    // initial (possibly coarse) fix much faster than getCurrentPositionAsync,
    // which waits for a fix that fully satisfies the requested accuracy.
    try {
      const fix = await firstFix(FIX_TIMEOUT_MS);
      logger.debug('[LOC] getCurrentPosition: GOT FIX', fix.latitude, fix.longitude);
      return fix;
    } catch (firstErr: any) {
      logger.debug('[LOC] firstFix failed:', firstErr?.message ?? firstErr, '→ trying last-known');
      // Last resort: any cached fix the OS still holds.
      const last = await Location.getLastKnownPositionAsync();
      logger.debug('[LOC] fallback last-known =', last?.coords?.latitude, last?.coords?.longitude);
      if (last) {
        return { latitude: last.coords.latitude, longitude: last.coords.longitude };
      }
      logger.debug('[LOC] getCurrentPosition: THROW (no fix)');
      throw firstErr;
    }
  },

  /** Geocode a free-text address to coordinates. Returns null when nothing matches. */
  async geocode(query: string): Promise<LatLng | null> {
    const results = await Location.geocodeAsync(query.trim());
    const first = results[0];
    return first ? { latitude: first.latitude, longitude: first.longitude } : null;
  },
};
