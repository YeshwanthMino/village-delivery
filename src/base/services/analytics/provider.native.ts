import type { AnalyticsProvider } from './AnalyticsProvider';
import { createFirebaseNativeProvider } from './firebase.native';

/** Change this one selection point to move native analytics to another SDK. */
export function createSelectedProvider(): AnalyticsProvider {
  return createFirebaseNativeProvider();
}
