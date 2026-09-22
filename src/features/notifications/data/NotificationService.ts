// src/features/notifications/data/NotificationService.ts

import * as Notifications from 'expo-notifications';
import { logger } from '@/src/base/services/logger';

export type PushPermissionState = 'granted' | 'denied' | 'undetermined';

export interface PushPermissionResult {
  granted: boolean;
  /** False once the OS will no longer show the system dialog (permanently denied). */
  canAskAgain: boolean;
}

export const NotificationService = {
  async getPermissionState(): Promise<PushPermissionState> {
    const { status } = await Notifications.getPermissionsAsync();
    return status as PushPermissionState;
  },

  /**
   * Request permission. When already permanently denied the OS resolves
   * immediately without showing a dialog, so the caller can branch on
   * `canAskAgain` — same contract as LocationService.requestPermission.
   */
  async requestPermission(): Promise<PushPermissionResult> {
    const { status, canAskAgain } = await Notifications.requestPermissionsAsync();
    return { granted: status === 'granted', canAskAgain };
  },

  /**
   * Native device push token: the raw FCM registration token on Android, the
   * raw APNs token on iOS. Not an Expo push token — nothing here talks to
   * Expo's push relay service. Returns null (never throws) on failure, e.g. no
   * network, or a simulator/emulator without push capability.
   */
  async getDeviceToken(): Promise<string | null> {
    try {
      const result = await Notifications.getDevicePushTokenAsync();
      return result.data ?? null;
    } catch (e) {
      // Never log the token itself (see logger.ts) — only that the fetch failed.
      logger.warn('[PUSH] getDeviceToken failed:', e instanceof Error ? e.message : e);
      return null;
    }
  },
};
