import { Sparkles } from 'lucide-react-native';
import React from 'react';
import { Text, View } from 'react-native';
import { rupees } from '@/src/features/home/data/static/villageData';

interface SavingsStripProps {
  savings: number;  // pre-multiplier float
}

export const SavingsStrip = ({ savings }: SavingsStripProps) => {
  if (savings <= 0) return null;
  return (
    <View className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 flex-row items-center gap-2">
      <Sparkles size={16} color="#d97706" />
      <Text className="text-amber-800 text-sm font-medium">
        You're saving <Text className="font-bold">{rupees(savings)}</Text> on this order
      </Text>
    </View>
  );
};
