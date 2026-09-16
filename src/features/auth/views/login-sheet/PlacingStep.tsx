import React, { useEffect } from 'react';
import { Text, View } from 'react-native';
import { Truck } from 'lucide-react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { s } from './styles';

// ─── Placing Step ──────────────────────────────────────────────────────────────

export const PlacingStep = () => {
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 900, easing: Easing.linear }),
      -1,
      false,
    );
    return () => cancelAnimation(rotation);
  }, []);

  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <View style={s.centeredStep}>
      <View style={s.spinnerWrap}>
        <View style={s.spinnerBg} />
        <Animated.View style={[s.spinnerRing, spinStyle]} />
        <Truck size={28} color="#15803d" strokeWidth={2.2} />
      </View>
      <Text style={s.centeredTitle}>Placing your order…</Text>
      <Text style={s.centeredSubtitle}>Hold on while we confirm with the store.</Text>
    </View>
  );
};
