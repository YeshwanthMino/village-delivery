import { useEffect } from 'react';
import { Platform } from 'react-native';
import { usePathname } from 'expo-router';
import { useAuthStore } from '@/src/core/store';
import { logger } from '@/src/base/services/logger';
import { setAnalyticsUser, trackScreen } from './analytics';
import { initCrashlytics, setCrashlyticsUser } from './crashlytics';
import { getFcmToken, onFcmTokenRefresh, onForegroundMessage } from './messaging';

const enabled = Platform.OS !== 'web';

export function useFirebaseLifecycle() {
  const pathname = usePathname();
  const userId = useAuthStore((s) => (s.user?.id != null ? String(s.user.id) : null));

  useEffect(() => {
    if (!enabled) return;
    void initCrashlytics();
    // Token is not sent anywhere yet: the backend has no device-token endpoint.
    getFcmToken().catch((e) => logger.warn('FCM token unavailable', e));
    const offToken = onFcmTokenRefresh(() => {});
    const offMessage = onForegroundMessage((m) => logger.debug('FCM foreground', m.messageId));
    return () => {
      offToken();
      offMessage();
    };
  }, []);

  useEffect(() => {
    if (enabled) void trackScreen(pathname);
  }, [pathname]);

  useEffect(() => {
    if (!enabled) return;
    void setAnalyticsUser(userId);
    if (userId) setCrashlyticsUser(userId);
  }, [userId]);
}
