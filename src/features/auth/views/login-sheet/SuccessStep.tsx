import React, { useEffect } from 'react';
import { Text, View } from 'react-native';
import { Check, Phone } from 'lucide-react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { formatPhone } from './helpers';
import { s } from './styles';
import { rupees } from '@/src/shared/utils/currency';

interface SuccessStepProps {
  phone: string;
  onDone: () => void;
  grandTotal: number;
  itemCount: number;
}

export const SuccessStep = ({ phone, onDone, grandTotal, itemCount }: SuccessStepProps) => {
  const scale = useSharedValue(0.5);
  const opacity = useSharedValue(0);
  const ringScale = useSharedValue(1);
  const ringOpacity = useSharedValue(0.6);

  useEffect(() => {
    scale.value = withSpring(1, { damping: 12, stiffness: 200 });
    opacity.value = withTiming(1, { duration: 300 });
    ringScale.value = withRepeat(withTiming(1.5, { duration: 900 }), -1, false);
    ringOpacity.value = withRepeat(withTiming(0, { duration: 900 }), -1, false);

    const t = setTimeout(onDone, 1800);
    return () => {
      clearTimeout(t);
      cancelAnimation(scale);
      cancelAnimation(ringScale);
      cancelAnimation(ringOpacity);
    };
  }, []);

  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value,
  }));

  return (
    <View style={s.centeredStep}>
      <View style={s.spinnerWrap}>
        <Animated.View style={[s.pulseRing, ringStyle]} />
        <Animated.View style={[s.checkCircleBg, checkStyle]}>
          <Check size={40} color="#fff" strokeWidth={3.5} />
        </Animated.View>
      </View>
      <Text style={s.centeredTitle}>Order placed!</Text>
      <Text style={[s.centeredSubtitle, { textAlign: 'center', maxWidth: 240 }]}>
        {itemCount} {itemCount === 1 ? 'item' : 'items'} · {rupees(grandTotal)} · arriving in{' '}
        <Text style={{ fontWeight: '800', color: '#0f172a' }}>12 min</Text>
      </Text>
      <View style={s.smsConfirm}>
        <Phone size={12} color="#94a3b8" />
        <Text style={s.smsConfirmText}>SMS sent to +91 {formatPhone(phone)}</Text>
      </View>
    </View>
  );
};
