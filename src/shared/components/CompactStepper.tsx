import { Minus, Plus } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

interface CompactStepperProps {
  count: number;
  onAdd: () => void;
  onDec: () => void;
}

export const CompactStepper = ({ count, onAdd, onDec }: CompactStepperProps) => (
  <View className="flex-row items-center border-2 border-green-600 rounded-lg">
    <TouchableOpacity
      onPress={onDec}
      className="w-8 h-9 items-center justify-center active:bg-green-50"
    >
      <Minus size={14} color="#15803d" />
    </TouchableOpacity>
    <Text className="text-green-700 font-extrabold text-sm min-w-[24px] text-center">
      {count}
    </Text>
    <TouchableOpacity
      onPress={onAdd}
      className="w-8 h-9 items-center justify-center active:bg-green-50"
    >
      <Plus size={14} color="#15803d" />
    </TouchableOpacity>
  </View>
);
