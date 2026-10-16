import type { AnalyticsProvider } from './AnalyticsProvider';

export const noOpAnalyticsProvider: AnalyticsProvider = {
  isAvailable: () => false,
  track: () => {},
  identify: () => {},
  setUserProperties: () => {},
  reset: () => {},
};
