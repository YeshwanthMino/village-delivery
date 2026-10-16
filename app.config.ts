import type { ConfigContext, ExpoConfig } from 'expo/config';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY ?? '';
// EAS file environment variables can point to temporary absolute paths. Local
// builds can place the downloaded Firebase files at the project root.
const androidFirebaseFile = process.env.GOOGLE_SERVICES_JSON ?? './google-services.json';
const iosFirebaseFile = process.env.GOOGLE_SERVICE_INFO_PLIST ?? './GoogleService-Info.plist';
const firebaseConfigured =
  existsSync(resolve(androidFirebaseFile)) && existsSync(resolve(iosFirebaseFile));
const firebasePlugins: NonNullable<ExpoConfig['plugins']> = firebaseConfigured ? [
  '@react-native-firebase/app',
  ['@react-native-firebase/analytics', { ios: { withoutAdIdSupport: true } }],
] : [];

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...(config as ExpoConfig),
  ios: {
    ...config.ios,
    ...(firebaseConfigured ? { googleServicesFile: iosFirebaseFile } : {}),
    config: {
      ...config.ios?.config,
      googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    },
  },
  android: {
    ...config.android,
    ...(firebaseConfigured ? { googleServicesFile: androidFirebaseFile } : {}),
    config: {
      ...config.android?.config,
      googleMaps: { apiKey: GOOGLE_MAPS_API_KEY },
    },
  },
  plugins: [
    ...(Array.isArray(config.plugins) ? config.plugins : []),
    // The react-native-maps plugin reads androidGoogleMapsApiKey / iosGoogleMapsApiKey.
    // If the android prop is absent it REMOVES the com.google.android.geo.API_KEY
    // meta-data, so the prop names must match exactly.
    [
      'react-native-maps',
      {
        androidGoogleMapsApiKey: GOOGLE_MAPS_API_KEY,
        iosGoogleMapsApiKey: GOOGLE_MAPS_API_KEY,
      },
    ],
    // RNFirebase's iOS pods require static frameworks, even in a development
    // build made before the project-specific Firebase files are supplied.
    ['expo-build-properties', { ios: { useFrameworks: 'static' } }],
    ...firebasePlugins,
  ],
});
