import React from 'react';
import { Platform, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { rupees } from '@/src/features/home/data/static/villageData';

// Tab bar height defined in app/(dashboard)/_layout.tsx
const TAB_BAR_HEIGHT = 64;

interface CheckoutBarProps {
  grandTotal: number;   // pre-multiplier float
  savings: number;      // pre-multiplier float
}

export const CheckoutBar = ({ grandTotal, savings }: CheckoutBarProps) => {
  const insets = useSafeAreaInsets();
  // paddingBottom = tab bar visual height + extra gap
  // SafeAreaView already accounts for insets.bottom, so we only add TAB_BAR_HEIGHT
  const bottomPad = TAB_BAR_HEIGHT + (Platform.OS === 'ios' ? 8 : 4);

  return (
  <View style={{ marginHorizontal: 12, marginBottom: 8, paddingBottom: bottomPad }}>
    <TouchableOpacity
      className="bg-green-600 rounded-2xl h-14 flex-row items-center justify-between px-5"
      style={{ shadowColor: '#16a34a', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.45, shadowRadius: 24, elevation: 12 }}
    >
      <View>
        <Text className="text-white font-bold text-base">{rupees(grandTotal)}</Text>
        {savings > 0 && (
          <Text className="text-white/70 text-[10px]">saving {rupees(savings)}</Text>
        )}
      </View>
      <Text className="text-white font-bold text-sm uppercase tracking-wide">Proceed to Checkout →</Text>
    </TouchableOpacity>
  </View>
  );
};
