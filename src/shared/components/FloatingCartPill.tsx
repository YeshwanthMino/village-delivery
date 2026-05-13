import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

interface FloatingCartPillProps {
  count: number;
  onPress: () => void;
}

export const FloatingCartPill = ({ count, onPress }: FloatingCartPillProps) => {
  if (count === 0) return null;
  return (
    <TouchableOpacity
      onPress={onPress}
      className="bg-green-600 rounded-2xl mx-3 mb-2 h-12 flex-row items-center justify-between px-4"
      style={{ shadowColor: '#16a34a', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 8 }}
    >
      <View className="flex-row items-center gap-2">
        <View className="w-6 h-6 bg-white/20 rounded-full items-center justify-center">
          <Text className="text-white font-bold text-xs">{count}</Text>
        </View>
        <Text className="text-white font-semibold text-sm">
          {count === 1 ? '1 item in cart' : `${count} items in cart`}
        </Text>
      </View>
      <Text className="text-white font-bold text-sm">View cart →</Text>
    </TouchableOpacity>
  );
};
