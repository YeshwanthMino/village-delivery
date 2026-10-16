import type { AnalyticsEventName, AnalyticsEventValue } from './events';

/** The only contract that a Firebase, MoEngage, or future adapter must meet. */
export interface AnalyticsProvider {
  /** Optional readiness probe for events that are locally marked delivered. */
  isAvailable?(): Promise<boolean> | boolean;
  track(name: AnalyticsEventName, properties: Record<string, AnalyticsEventValue>): Promise<void> | void;
  /** Pass an opaque backend user id, never a phone number or email. */
  identify(userId: string | null): Promise<void> | void;
  setUserProperties(properties: Record<string, string | null>): Promise<void> | void;
  reset(): Promise<void> | void;
}
