import { Minus, Plus, Trash2 } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

interface FullWidthStepperProps {
  count: number;
  onAdd: () => void;
  onDec: () => void;
}

export const FullWidthStepper = ({ count, onAdd, onDec }: FullWidthStepperProps) => (
  <View className="flex-row items-center border-2 border-green-600 rounded-lg h-10">
    <TouchableOpacity
      onPress={onDec}
      className="flex-1 items-center justify-center h-full active:bg-green-50"
    >
      {count === 1
        ? <Trash2 size={16} color="#15803d" />
        : <Minus size={16} color="#15803d" />}
    </TouchableOpacity>
    <Text className="text-green-700 font-extrabold text-base min-w-[28px] text-center">
      {count}
    </Text>
    <TouchableOpacity
      onPress={onAdd}
      className="flex-1 items-center justify-center h-full active:bg-green-50"
    >
      <Plus size={16} color="#15803d" />
    </TouchableOpacity>
  </View>
);
