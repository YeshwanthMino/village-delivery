import {
  getInitialNotification,
  getMessaging,
  getToken,
  onMessage,
  onNotificationOpenedApp,
  onTokenRefresh,
  requestPermission,
  setBackgroundMessageHandler,
  AuthorizationStatus,
  type RemoteMessage as FcmRemoteMessage,
} from '@react-native-firebase/messaging';
import { PermissionsAndroid, Platform } from 'react-native';
import { logger } from '@/src/base/services/logger';

export type RemoteMessage = FcmRemoteMessage;

const messaging = () => getMessaging();

/** Must be called at module scope (app/_layout.tsx import time), outside any component. */
export const registerBackgroundHandler = () =>
  setBackgroundMessageHandler(messaging(), async (message) => {
    logger.debug('FCM background message', message.messageId);
  });

export async function requestPushPermission(): Promise<boolean> {
  if (Platform.OS === 'android' && Number(Platform.Version) >= 33) {
    const result = await PermissionsAndroid.request('android.permission.POST_NOTIFICATIONS');
    return result === PermissionsAndroid.RESULTS.GRANTED;
  }
  const status = await requestPermission(messaging());
  return (
    status === AuthorizationStatus.AUTHORIZED || status === AuthorizationStatus.PROVISIONAL
  );
}

export const getFcmToken = () => getToken(messaging());

export const onFcmTokenRefresh = (cb: (token: string) => void) =>
  onTokenRefresh(messaging(), cb);

export const onForegroundMessage = (cb: (m: RemoteMessage) => void) =>
  onMessage(messaging(), cb);

export const onNotificationOpened = (cb: (m: RemoteMessage) => void) =>
  onNotificationOpenedApp(messaging(), cb);

export const getLaunchNotification = () => getInitialNotification(messaging());
