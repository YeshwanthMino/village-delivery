import { Sparkles } from 'lucide-react-native';
import React from 'react';
import { Text, View } from 'react-native';

export const PromoStrip = () => (
  <View className="bg-green-50 border border-green-100 rounded-2xl p-3 flex-row items-center gap-3">
    <View className="w-10 h-10 bg-green-600 rounded-xl items-center justify-center">
      <Sparkles size={20} color="white" />
    </View>
    <View className="flex-1">
      <Text className="text-slate-900 font-bold text-sm">10% off your first order</Text>
      <Text className="text-slate-500 text-xs mt-0.5">Use code at checkout</Text>
    </View>
    <View className="border border-dashed border-green-600 rounded-lg px-2 py-1">
      <Text className="text-green-700 font-black text-xs tracking-wider">VILLAGE10</Text>
    </View>
  </View>
);
