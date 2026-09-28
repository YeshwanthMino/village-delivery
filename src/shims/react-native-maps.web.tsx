// Web stand-in for react-native-maps, which is native-only (its bundle calls
// codegenNativeComponent, which react-native-web lacks). Metro aliases
// `react-native-maps` to this file on web (see metro.config.js). It renders a
// placeholder so screens that import the map still load; the map itself is
// only available on iOS/Android.

import React, { forwardRef, useImperativeHandle } from 'react';
import { View, Text, type ViewProps } from 'react-native';

export const PROVIDER_GOOGLE = 'google';
export const PROVIDER_DEFAULT = null;

export interface Region {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

type MapViewProps = ViewProps & {
  provider?: unknown;
  initialRegion?: Region;
  onRegionChangeComplete?: (region: Region) => void;
};

export interface MapViewHandle {
  animateToRegion: (region: Region, duration?: number) => void;
}

const MapView = forwardRef<MapViewHandle, MapViewProps>(function MapView({ style }, ref) {
  useImperativeHandle(ref, () => ({ animateToRegion: () => {} }));
  return (
    <View style={[{ alignItems: 'center', justifyContent: 'center', backgroundColor: '#e5e7eb' }, style]}>
      <Text>Map is available on the mobile app</Text>
    </View>
  );
});

export default MapView;
