// src/core/store/useNotificationStore.ts

import { create } from 'zustand';
import { StoredPrefs } from '@/src/base/services/remote/storage/StoredPrefs';
import { StorageKeys } from '@/src/base/constants/AppConstants';
import { NotificationService, PushPermissionState } from '@/src/features/notifications/data/NotificationService';

interface NotificationState {
  permission: PushPermissionState;
  /** True once refreshPermission has resolved at least once. Gates HomeScreen's
   *  sheet so it never opens on the default 'undetermined' before the real
   *  status has loaded — same role as useLocationStore's `hydrated`. */
  permissionChecked: boolean;
  blocked: boolean; // permanently denied ("Don't ask again")
  deviceToken: string | null;
}

interface NotificationActions {
  hydrate: () => Promise<void>;
  refreshPermission: () => Promise<PushPermissionState>;
  registerToken: () => Promise<void>;
  requestAndRegister: () => Promise<boolean>;
}

type NotificationStore = NotificationState & NotificationActions;

const initialState: NotificationState = {
  permission: 'undetermined',
  permissionChecked: false,
  blocked: false,
  deviceToken: null,
};

// Module-level race guard (not in render state) — mirrors useLocationStore's
// `inflight`. usePushNotifications calls registerToken from two independent
// places (mount-time seed and the AppState 'active' handler); without this,
// a foreground blip shortly after cold start could trigger two concurrent
// native getDevicePushTokenAsync() calls and a duplicate storage write.
let registerInflight: Promise<void> | null = null;

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  ...initialState,

  hydrate: async () => {
    const token = await StoredPrefs.getCustomData<string>(StorageKeys.PUSH_DEVICE_TOKEN);
    set({ deviceToken: token ?? null });
  },

  refreshPermission: async () => {
    const permission = await NotificationService.getPermissionState();
    set({ permission, permissionChecked: true });
    return permission;
  },

  registerToken: async () => {
    if (registerInflight) return registerInflight;
    registerInflight = (async () => {
      const token = await NotificationService.getDeviceToken();
      set({ deviceToken: token });
      if (token) {
        await StoredPrefs.setCustomData(StorageKeys.PUSH_DEVICE_TOKEN, token);
      }
    })();
    try {
      await registerInflight;
    } finally {
      registerInflight = null;
    }
  },

  requestAndRegister: async () => {
    const res = await NotificationService.requestPermission();
    set({
      permission: res.granted ? 'granted' : 'denied',
      permissionChecked: true,
      blocked: !res.granted && !res.canAskAgain,
    });
    if (!res.granted) return false;
    await get().registerToken();
    return true;
  },
}));
