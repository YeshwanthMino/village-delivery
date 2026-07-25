import { Minus, Plus } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

interface CompactStepperProps {
  count: number;
  onAdd: () => void;
  onDec: () => void;
  maxQuantity?: number;
  /** Suffix for the increment/decrement testIDs, so multiple steppers on one
   *  screen stay addressable in tests. */
  testIDSuffix?: string;
}

export const CompactStepper = ({ count, onAdd, onDec, maxQuantity, testIDSuffix }: CompactStepperProps) => {
  const canAdd = maxQuantity === undefined || count < maxQuantity;
  const suffix = testIDSuffix ? `-${testIDSuffix}` : '';

  return (
    <View className="flex-row items-center border-2 border-green-600 rounded-lg h-11">
      <TouchableOpacity
        onPress={onDec}
        testID={`stepper-dec${suffix}`}
        className="w-12 h-full items-center justify-center active:bg-green-50"
      >
        <Minus size={14} color="#15803d" />
      </TouchableOpacity>
      <Text className="flex-1 text-green-700 font-extrabold text-sm text-center">
        {count}
      </Text>
      <TouchableOpacity
        onPress={onAdd}
        disabled={!canAdd}
        testID={`stepper-add${suffix}`}
        className={`w-12 h-full items-center justify-center ${canAdd ? 'active:bg-green-50' : 'opacity-50'}`}
      >
        <Plus size={14} color={canAdd ? '#15803d' : '#d1d5db'} />
      </TouchableOpacity>
    </View>
  );
};
