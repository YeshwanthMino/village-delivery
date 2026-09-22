// src/features/notifications/lifecycle/usePushNotifications.ts
//
// Mirrors useLocationLifecycle: seeds permission + cached token once, then
// reacts to AppState changes (catches a grant made from system Settings) and
// to notification taps (both while running and the one that launched the app
// from a killed state).
//
// setNotificationHandler is called at module scope (not inside the hook body)
// so it registers exactly once regardless of how many times the hook
// re-renders — it's a global handler, not per-instance state.

import { useEffect } from 'react';
import { AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useNotificationStore } from '@/src/core/store/useNotificationStore';
import { handleNotificationResponse } from './handleNotificationResponse';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export function usePushNotifications() {
  const router = useRouter();

  useEffect(() => {
    void (async () => {
      await useNotificationStore.getState().hydrate();
      const perm = await useNotificationStore.getState().refreshPermission();
      // Already granted (returning user) — refresh the token silently, no sheet.
      if (perm === 'granted') {
        await useNotificationStore.getState().registerToken();
      }
    })();

    // The tap that launched the app from a killed state. Cleared immediately
    // after handling so a later remount in the same session (error-boundary
    // reset, Fast Refresh) can't replay it and re-fire router.push.
    const lastResponse = Notifications.getLastNotificationResponse();
    if (lastResponse) {
      handleNotificationResponse(lastResponse, router);
      void Notifications.clearLastNotificationResponseAsync();
    }

    const tapSub = Notifications.addNotificationResponseReceivedListener((response) => {
      handleNotificationResponse(response, router);
    });

    const appStateSub = AppState.addEventListener('change', async (state) => {
      if (state !== 'active') return;
      const store = useNotificationStore.getState();
      const prevPerm = store.permission;
      const perm = await store.refreshPermission();
      if (prevPerm !== 'granted' && perm === 'granted') {
        await useNotificationStore.getState().registerToken(); // granted from Settings
      }
    });

    return () => {
      tapSub.remove();
      appStateSub.remove();
    };
  }, [router]);
}
