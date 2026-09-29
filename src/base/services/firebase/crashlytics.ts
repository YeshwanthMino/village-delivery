import {
  getCrashlytics,
  log,
  recordError,
  setCrashlyticsCollectionEnabled,
  setUserId,
} from '@react-native-firebase/crashlytics';

const crashlytics = () => getCrashlytics();

export const initCrashlytics = () =>
  setCrashlyticsCollectionEnabled(crashlytics(), !__DEV__).catch(() => {});

export const reportError = (error: unknown, context?: string) => {
  const err = error instanceof Error ? error : new Error(String(error));
  if (context) log(crashlytics(), context);
  recordError(crashlytics(), err);
};

export const setCrashlyticsUser = (userId: string) => {
  setUserId(crashlytics(), userId).catch(() => {});
};
