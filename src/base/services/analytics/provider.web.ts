import type { AnalyticsProvider } from './AnalyticsProvider';
import { createFirebaseWebProvider } from './firebase.web';

/** Change this one selection point to move web analytics to another SDK. */
export function createSelectedProvider(): AnalyticsProvider {
  return createFirebaseWebProvider();
}
