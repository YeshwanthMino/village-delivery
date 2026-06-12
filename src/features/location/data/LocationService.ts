// src/features/location/data/LocationService.ts

import * as Location from 'expo-location';
import { LatLng } from '../domain/models';

export type PermissionState = 'granted' | 'denied' | 'undetermined';

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

  /**
   * Request permission. When already permanently denied the OS resolves immediately
   * without showing a dialog, so the caller can branch on `canAskAgain`.
   */
  async requestPermission(): Promise<PermissionResult> {
    const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
    return { granted: status === 'granted', canAskAgain };
  },

  /** Read the current position. Throws if location is unavailable. */
  async getCurrentPosition(): Promise<LatLng> {
    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
  },

  /** Geocode a free-text address to coordinates. Returns null when nothing matches. */
  async geocode(query: string): Promise<LatLng | null> {
    const results = await Location.geocodeAsync(query.trim());
    const first = results[0];
    return first ? { latitude: first.latitude, longitude: first.longitude } : null;
  },
};
