import { Minus, Plus, Trash2 } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useSnackbarStore } from '@/src/core/store/useSnackbarStore';
import { useTranslation } from '@/src/core/utils/useTranslation';
import { interpolate } from '@/src/base/constants/translations';

interface FullWidthStepperProps {
  count: number;
  onAdd: () => void;
  onDec: () => void;
  maxQuantity?: number;
  /** Px to float the stock-limit snackbar above the bottom of the screen. */
  bottomOffset?: number;
}

export const FullWidthStepper = ({ count, onAdd, onDec, maxQuantity, bottomOffset }: FullWidthStepperProps) => {
  const canAdd = maxQuantity === undefined || count < maxQuantity;
  const { t } = useTranslation();

  const handleAdd = () => {
    if (!canAdd) {
      useSnackbarStore.getState().show(interpolate(t('stock_limit_reached'), maxQuantity!), bottomOffset);
      return;
    }
    onAdd();
  };

  return (
    <View className="flex-row items-center border-2 border-green-600 rounded-lg h-10">
      <TouchableOpacity
        onPress={onDec}
        testID="stepper-dec"
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
        onPress={handleAdd}
        testID="stepper-add"
        className={`flex-1 items-center justify-center h-full ${canAdd ? 'active:bg-green-50' : 'opacity-50'}`}
      >
        <Plus size={16} color={canAdd ? '#15803d' : '#d1d5db'} />
      </TouchableOpacity>
    </View>
  );
};
