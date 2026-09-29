import { getAnalytics, logEvent, logScreenView, setUserId } from '@react-native-firebase/analytics';
import { logger } from '@/src/base/services/logger';

const analytics = () => getAnalytics();

const safe = (label: string, task: Promise<unknown> | void) =>
  Promise.resolve(task).catch((e) => logger.warn(`analytics ${label} failed`, e));

export const trackEvent = (name: string, params?: Record<string, string | number | boolean>) =>
  safe(name, logEvent(analytics(), name, params));

export const trackScreen = (screenName: string) =>
  safe('screen_view', logScreenView(analytics(), { screen_name: screenName, screen_class: screenName }));

export const setAnalyticsUser = (userId: string | null) =>
  safe('setUserId', setUserId(analytics(), userId));
