// src/features/notifications/viewmodel/useNotificationViewModel.ts
//
// Thin adapter over useNotificationStore, mirroring useLocationViewModel:
// permission/blocked live in the store (single source of truth); this hook
// only adds the local "dismiss the blocked sheet without touching the OS
// permission" flag and the Settings deep link.

import { useCallback, useState } from 'react';
import { Linking } from 'react-native';
import { useNotificationStore } from '@/src/core/store/useNotificationStore';

export function useNotificationViewModel() {
  const permission = useNotificationStore((s) => s.permission);
  const storeBlocked = useNotificationStore((s) => s.blocked);
  const requestAndRegister = useNotificationStore((s) => s.requestAndRegister);

  const [blockedDismissed, setBlockedDismissed] = useState(false);
  const blocked = storeBlocked && !blockedDismissed;

  const openSettings = useCallback(() => {
    Linking.openSettings().catch(() => {});
  }, []);

  const dismissBlocked = useCallback(() => setBlockedDismissed(true), []);

  const requestPermission = useCallback(() => {
    setBlockedDismissed(false);
    return requestAndRegister();
  }, [requestAndRegister]);

  return { permission, blocked, requestPermission, openSettings, dismissBlocked };
}
