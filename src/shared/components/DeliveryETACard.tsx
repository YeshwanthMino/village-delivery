import { ChevronRight, Clock } from 'lucide-react-native';
import React from 'react';
import { Text, View } from 'react-native';

export const DeliveryETACard = () => (
  <View className="bg-gradient-to-r from-green-600 to-emerald-700 rounded-2xl p-3.5 flex-row items-center">
    <View className="w-10 h-10 bg-white/20 rounded-xl items-center justify-center mr-3">
      <Clock size={20} color="white" />
    </View>
    <View className="flex-1">
      <Text className="text-white font-bold text-sm">Delivery in 12 min</Text>
      <Text className="text-white/70 text-xs mt-0.5">Free over ₹500</Text>
    </View>
    <ChevronRight size={18} color="rgba(255,255,255,0.7)" />
  </View>
);
