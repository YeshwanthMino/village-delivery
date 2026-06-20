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
    ['react-native-maps', { googleMapsApiKey: GOOGLE_MAPS_API_KEY }],
  ],
});
