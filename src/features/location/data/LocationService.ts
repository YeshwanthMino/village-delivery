// src/features/location/data/LocationService.ts

import * as Location from 'expo-location';
import { LatLng } from '../domain/models';

export type PermissionState = 'granted' | 'denied' | 'undetermined';

export const LocationService = {
  async getPermissionState(): Promise<PermissionState> {
    const { status } = await Location.getForegroundPermissionsAsync();
    return status as PermissionState;
  },

  /** Request permission. Returns whether it is granted. */
  async requestPermission(): Promise<boolean> {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === 'granted';
  },

  /** Read the current position. Throws if location is unavailable. */
  async getCurrentPosition(): Promise<LatLng> {
    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
  },
};
