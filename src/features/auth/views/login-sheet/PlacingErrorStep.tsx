import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { RotateCcw, TriangleAlert } from 'lucide-react-native';
import { s } from './styles';

interface PlacingErrorStepProps {
  message: string;
  onRetry: () => void;
  onClose: () => void;
}

export const PlacingErrorStep = ({ message, onRetry, onClose }: PlacingErrorStepProps) => (
  <View style={s.centeredStep}>
    <View style={s.errorCircleBg}>
      <TriangleAlert size={34} color="#dc2626" strokeWidth={2.4} />
    </View>
    <Text style={s.centeredTitle}>Order not placed</Text>
    <Text style={[s.centeredSubtitle, { textAlign: 'center', maxWidth: 260 }]}>{message}</Text>
    <TouchableOpacity
      onPress={onRetry}
      style={[s.cta, s.ctaActive, { alignSelf: 'stretch', flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 20 }]}
      activeOpacity={0.85}
    >
      <RotateCcw size={18} color="#fff" strokeWidth={2.6} />
      <Text style={[s.ctaText, s.ctaTextActive]}>Try again</Text>
    </TouchableOpacity>
    <TouchableOpacity onPress={onClose} style={{ paddingVertical: 12 }} activeOpacity={0.7}>
      <Text style={{ color: '#64748b', fontWeight: '700', fontSize: 14 }}>Back to cart</Text>
    </TouchableOpacity>
  </View>
);
