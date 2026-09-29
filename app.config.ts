import type { ConfigContext, ExpoConfig } from 'expo/config';

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY ?? '';
// Firebase config files are git-ignored. Locally, drop them in the project root;
// on EAS, upload them as file-type environment variables with these names.
const GOOGLE_SERVICES_JSON = process.env.GOOGLE_SERVICES_JSON ?? './google-services.json';
const GOOGLE_SERVICE_INFO_PLIST = process.env.GOOGLE_SERVICE_INFO_PLIST ?? './GoogleService-Info.plist';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...(config as ExpoConfig),
  ios: {
    ...config.ios,
    googleServicesFile: GOOGLE_SERVICE_INFO_PLIST,
    config: {
      ...config.ios?.config,
      googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    },
  },
  android: {
    ...config.android,
    googleServicesFile: GOOGLE_SERVICES_JSON,
    config: {
      ...config.android?.config,
      googleMaps: { apiKey: GOOGLE_MAPS_API_KEY },
    },
  },
  plugins: [
    ...(Array.isArray(config.plugins) ? config.plugins : []),
    '@react-native-firebase/app',
    '@react-native-firebase/crashlytics',
    // RN Firebase iOS pods need static frameworks.
    ['expo-build-properties', { ios: { useFrameworks: 'static' } }],
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
  ],
});
