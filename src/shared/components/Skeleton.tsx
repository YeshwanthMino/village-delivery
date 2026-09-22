// src/shared/components/Skeleton.tsx
//
// Lightweight shimmer placeholder. A gentle opacity pulse on a slate block — works
// for any size without layout measurement.

import React, { useEffect } from 'react';
import { ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

interface Props {
  width?: number | string;
  height?: number;
  radius?: number;
  style?: ViewStyle;
}

export const Skeleton = ({ width = '100%', height = 16, radius = 12, style }: Props) => {
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(1, { duration: 800 }), -1, true);
  }, [opacity]);

  const animated = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        { width: width as any, height, borderRadius: radius, backgroundColor: '#e2e8f0' },
        style,
        animated,
      ]}
    />
  );
};
