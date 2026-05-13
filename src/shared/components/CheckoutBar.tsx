import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { rupees } from '@/src/features/home/data/static/villageData';

interface CheckoutBarProps {
  grandTotal: number;   // pre-multiplier float
  savings: number;      // pre-multiplier float
}

export const CheckoutBar = ({ grandTotal, savings }: CheckoutBarProps) => (
  <View className="mx-3 mb-2">
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
