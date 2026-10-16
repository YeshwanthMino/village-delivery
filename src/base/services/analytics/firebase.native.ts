import type { AnalyticsProvider } from './AnalyticsProvider';
import type { AnalyticsEventName, AnalyticsEventValue } from './events';

/** Only the small Firebase methods used by the provider are needed. */
export interface FirebaseAnalyticsClient {
  logEvent(name: string, properties: Record<string, string | number>): Promise<void>;
  setUserId(userId: string | null): Promise<void>;
  setUserProperties(properties: Record<string, string | null>): Promise<void>;
  resetAnalyticsData(): Promise<void>;
}

export type FirebaseAnalyticsLoader = () => Promise<FirebaseAnalyticsClient | null>;

/**
 * Resolve native modules lazily. Expo Go, an older development build, or a
 * build without Firebase config has no usable default Firebase app. All three
 * cases leave the app functional and event delivery inactive.
 */
export const loadNativeFirebaseAnalytics: FirebaseAnalyticsLoader = async () => {
  try {
    const [app, analytics] = await Promise.all([
      import('@react-native-firebase/app'),
      import('@react-native-firebase/analytics'),
    ]);
    if (!app.getApps().some((candidate) => candidate.name === '[DEFAULT]')) return null;
    return analytics.getAnalytics(app.getApp()) as FirebaseAnalyticsClient;
  } catch {
    return null;
  }
};

export function createFirebaseNativeProvider(
  loadClient: FirebaseAnalyticsLoader = loadNativeFirebaseAnalytics,
): AnalyticsProvider {
  let clientPromise: Promise<FirebaseAnalyticsClient | null> | null = null;
  const client = () => {
    if (!clientPromise) clientPromise = Promise.resolve().then(loadClient).catch(() => null);
    return clientPromise;
  };

  return {
    async isAvailable() { return !!(await client()); },
    async track(name: AnalyticsEventName, properties: Record<string, AnalyticsEventValue>) {
      const sdk = await client();
      if (!sdk) return;
      // Firebase event parameters accept strings and numbers. Encode booleans
      // as 1/0 so the app's provider-independent event API stays unchanged.
      const firebaseProperties: Record<string, string | number> = {};
      for (const [key, value] of Object.entries(properties)) {
        firebaseProperties[key] = typeof value === 'boolean' ? Number(value) : value;
      }
      await sdk.logEvent(name, firebaseProperties);
    },
    async identify(userId: string | null) {
      const sdk = await client();
      if (sdk) await sdk.setUserId(userId);
    },
    async setUserProperties(properties: Record<string, string | null>) {
      const sdk = await client();
      if (sdk) await sdk.setUserProperties(properties);
    },
    async reset() {
      const sdk = await client();
      if (!sdk) return;
      await sdk.setUserId(null);
      await sdk.resetAnalyticsData();
    },
  };
}
