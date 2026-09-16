import type { ConfigContext, ExpoConfig } from 'expo/config';

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY ?? '';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...(config as ExpoConfig),
  ios: {
    ...config.ios,
    config: {
      ...config.ios?.config,
      googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    },
  },
  android: {
    ...config.android,
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
  ],
});
