import type { FirebaseOptions } from 'firebase/app';
import type { AnalyticsProvider } from './AnalyticsProvider';
import { USER_PROPERTY_KEYS, type AnalyticsEventName, type AnalyticsEventValue } from './events';
import { noOpAnalyticsProvider } from './noop';

export interface FirebaseWebConfig extends FirebaseOptions {
  apiKey: string;
  appId: string;
  projectId: string;
  measurementId: string;
}

/** Expo replaces direct EXPO_PUBLIC_* reads during both native and web builds. */
export function readFirebaseWebConfig(): FirebaseWebConfig | null {
  const apiKey = process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
  const appId = process.env.EXPO_PUBLIC_FIREBASE_WEB_APP_ID || process.env.EXPO_PUBLIC_FIREBASE_APP_ID;
  const projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
  const measurementId = process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID;
  if (!apiKey || !appId || !projectId || !measurementId) return null;

  return {
    apiKey,
    appId,
    projectId,
    measurementId,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  };
}

export interface FirebaseWebClient {
  logEvent(name: string, properties: Record<string, string | number>): void;
  setUserId(userId: string | null): void;
  setUserProperties(properties: Record<string, string | null>): void;
}

export type FirebaseWebLoader = (config: FirebaseWebConfig) => Promise<FirebaseWebClient | null>;

const WEB_APP_NAME = 'village-delivery-analytics';

/**
 * The Firebase JS Analytics SDK requires a real browser and IndexedDB/cookie
 * support. Load it only after that check; SSR and unsupported browsers remain
 * functional without emitting events.
 */
export const loadWebFirebaseAnalytics: FirebaseWebLoader = async (config) => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return null;

  try {
    const analyticsSdk = await import('firebase/analytics');
    if (!(await analyticsSdk.isSupported())) return null;

    const appSdk = await import('firebase/app');
    const app = appSdk.getApps().find((candidate) => candidate.name === WEB_APP_NAME)
      ?? appSdk.initializeApp(config, WEB_APP_NAME);
    const instance = analyticsSdk.getAnalytics(app);

    return {
      logEvent: (name, properties) => analyticsSdk.logEvent(instance, name, properties),
      setUserId: (userId) => analyticsSdk.setUserId(instance, userId),
      setUserProperties: (properties) => analyticsSdk.setUserProperties(instance, properties),
    };
  } catch {
    return null;
  }
};

export function createFirebaseWebProvider(
  config: FirebaseWebConfig | null = readFirebaseWebConfig(),
  loadClient: FirebaseWebLoader = loadWebFirebaseAnalytics,
): AnalyticsProvider {
  if (!config) return noOpAnalyticsProvider;

  let clientPromise: Promise<FirebaseWebClient | null> | null = null;
  const client = () => {
    if (!clientPromise) clientPromise = Promise.resolve().then(() => loadClient(config)).catch(() => null);
    return clientPromise;
  };

  return {
    async isAvailable() { return !!(await client()); },
    async track(name: AnalyticsEventName, properties: Record<string, AnalyticsEventValue>) {
      const sdk = await client();
      if (!sdk) return;
      const firebaseProperties: Record<string, string | number> = {};
      for (const [key, value] of Object.entries(properties)) {
        firebaseProperties[key] = typeof value === 'boolean' ? Number(value) : value;
      }
      sdk.logEvent(name, firebaseProperties);
    },
    async identify(userId: string | null) {
      const sdk = await client();
      if (sdk) sdk.setUserId(userId);
    },
    async setUserProperties(properties: Record<string, string | null>) {
      const sdk = await client();
      if (sdk) sdk.setUserProperties(properties);
    },
    async reset() {
      const sdk = await client();
      if (!sdk) return;
      sdk.setUserId(null);
      sdk.setUserProperties(Object.fromEntries(USER_PROPERTY_KEYS.map((key) => [key, null])));
      // Firebase's web Analytics API does not expose resetAnalyticsData().
      // This clears app-owned identity traits, while the browser's anonymous
      // Analytics client ID remains managed by Firebase.
    },
  };
}
