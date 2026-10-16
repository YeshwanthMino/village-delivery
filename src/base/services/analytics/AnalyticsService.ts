import { logger } from '@/src/base/services/logger';
import type { AnalyticsProvider } from './AnalyticsProvider';
import {
  EVENT_PROPERTY_KEYS,
  USER_PROPERTY_KEYS,
  type AnalyticsEventName,
  type AnalyticsEventProperties,
  type AnalyticsEventValue,
  type AnalyticsUserProperties,
} from './events';

function eventProperties<Name extends AnalyticsEventName>(
  name: Name,
  properties?: AnalyticsEventProperties[Name],
): Record<string, AnalyticsEventValue> {
  const allowed = EVENT_PROPERTY_KEYS[name] as readonly string[];
  const input = properties as Record<string, unknown> | undefined;
  const safe: Record<string, AnalyticsEventValue> = {};
  if (!input) return safe;

  for (const key of allowed) {
    const value = input[key];
    if (typeof value === 'string' && value.length > 0) safe[key] = value;
    else if (typeof value === 'boolean') safe[key] = value;
    else if (typeof value === 'number' && Number.isFinite(value)) safe[key] = value;
  }
  return safe;
}

function userProperties(properties: AnalyticsUserProperties): Record<string, string | null> {
  const safe: Record<string, string | null> = {};
  for (const key of USER_PROPERTY_KEYS) {
    const value = properties[key];
    if (value === null) safe[key] = null;
    else if (typeof value === 'boolean') safe[key] = String(value);
    else if (typeof value === 'string' && value.length > 0) safe[key] = value;
  }
  return safe;
}

/**
 * Nonblocking facade for the app. Serial delivery preserves identify/event/
 * reset order across async SDK calls; provider failures cannot interrupt a
 * customer action or poison subsequent events.
 */
export class AnalyticsService {
  private pending: Promise<void> = Promise.resolve();

  constructor(private readonly provider: AnalyticsProvider) {}

  private enqueue(deliver: () => Promise<void> | void): void {
    this.pending = this.pending.then(async () => {
      try {
        await deliver();
      } catch {
        logger.warn('Analytics delivery failed');
      }
    });
  }

  track<Name extends AnalyticsEventName>(name: Name, properties?: AnalyticsEventProperties[Name]): void {
    const safe = eventProperties(name, properties);
    this.enqueue(() => this.provider.track(name, safe));
  }

  async isAvailable(): Promise<boolean> {
    try { return this.provider.isAvailable ? await this.provider.isAvailable() : true; }
    catch { return false; }
  }

  identify(userId: string | null): void {
    this.enqueue(() => this.provider.identify(userId));
  }

  setUserProperties(properties: AnalyticsUserProperties): void {
    const safe = userProperties(properties);
    this.enqueue(() => this.provider.setUserProperties(safe));
  }

  reset(): void {
    this.enqueue(() => this.provider.reset());
  }

  /** Useful before app teardown and for integration tests. */
  flush(): Promise<void> {
    return this.pending;
  }
}
