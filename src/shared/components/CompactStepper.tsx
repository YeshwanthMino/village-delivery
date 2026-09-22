import { Minus, Plus } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSnackbarStore } from '@/src/core/store/useSnackbarStore';
import { useTranslation } from '@/src/core/utils/useTranslation';
import { interpolate } from '@/src/base/constants/translations';

interface CompactStepperProps {
  count: number;
  onAdd: () => void;
  onDec: () => void;
  maxQuantity?: number;
  /** Suffix for the increment/decrement testIDs, so multiple steppers on one
   *  screen stay addressable in tests. */
  testIDSuffix?: string;
  /** Px to float the stock-limit snackbar above the bottom of the screen. */
  bottomOffset?: number;
}

export const CompactStepper = ({
  count, onAdd, onDec, maxQuantity, testIDSuffix, bottomOffset,
}: CompactStepperProps) => {
  const canAdd = maxQuantity === undefined || count < maxQuantity;
  const suffix = testIDSuffix ? `-${testIDSuffix}` : '';
  const { t } = useTranslation();
  const { bottom } = useSafeAreaInsets();

  const handleAdd = () => {
    if (!canAdd) {
      // Callers that don't know what's beneath them (e.g. a stepper inside a
      // bottom sheet) get no explicit bottomOffset. Since StockSnackbar
      // renders full-screen (it's a Modal, so it isn't clipped to the
      // sheet's own bounds), a literal 0 would sit it behind the OS's
      // home-indicator/gesture-nav area — fall back to the safe-area inset
      // instead so it always clears that at minimum.
      useSnackbarStore.getState().show(interpolate(t('stock_limit_reached'), maxQuantity!), bottomOffset ?? bottom);
      return;
    }
    onAdd();
  };

  return (
    <View className="flex-row items-center border-2 border-green-600 rounded-lg h-11">
      <TouchableOpacity
        onPress={onDec}
        testID={`stepper-dec${suffix}`}
        className="w-12 h-full items-center justify-center active:bg-green-50"
      >
        <Minus size={14} color="#15803d" />
      </TouchableOpacity>
      <Text
        testID={`stepper-count${suffix}`}
        className="flex-1 text-green-700 font-extrabold text-sm text-center"
      >
        {count}
      </Text>
      <TouchableOpacity
        onPress={handleAdd}
        testID={`stepper-add${suffix}`}
        className={`w-12 h-full items-center justify-center ${canAdd ? 'active:bg-green-50' : 'opacity-50'}`}
      >
        <Plus size={14} color={canAdd ? '#15803d' : '#d1d5db'} />
      </TouchableOpacity>
    </View>
  );
};
