import { AnalyticsService } from './AnalyticsService';
import { createSelectedProvider } from './provider';
import { noOpAnalyticsProvider } from './noop';
import { AppConfig } from '@/src/base/constants/AppConstants';

/** Import this facade everywhere in the app; never import a vendor SDK there. */
export const analytics = new AnalyticsService(
  AppConfig.features.enableAnalytics ? createSelectedProvider() : noOpAnalyticsProvider,
);

export { AnalyticsService } from './AnalyticsService';
export type { AnalyticsProvider } from './AnalyticsProvider';
export type {
  AnalyticsEventName,
  AnalyticsEventProperties,
  AnalyticsUserProperties,
  AnalyticsProductContext,
} from './events';
