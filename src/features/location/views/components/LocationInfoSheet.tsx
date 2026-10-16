// src/features/location/views/components/LocationInfoSheet.tsx
//
// Bottom sheet for the map picker. Renders primary/secondary labels and the
// sticky CTA, switching copy + enabled-state by PinState.

import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from '@/src/core/utils/useTranslation';
import type { PinState } from '../../viewmodel/useMapPickerViewModel';

interface Props {
  pinState: PinState;
  primary: string;
  secondary: string | null;
  onConfirm: () => void;
  onRetry: () => void;
}

export const LocationInfoSheet = ({ pinState, primary, secondary, onConfirm, onRetry }: Props) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const canConfirm = pinState === 'serviceable';

  return (
    <View
      className="absolute left-0 right-0 bottom-0 bg-white rounded-t-3xl px-5 pt-5"
      style={{
        paddingBottom: insets.bottom + 20,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: -4 },
        elevation: 12,
      }}
    >
      {pinState === 'resolving' ? (
        <>
          <View className="h-6 w-40 bg-slate-100 rounded-md" />
          <View className="h-4 w-24 bg-slate-50 rounded-md mt-2.5" />
        </>
      ) : pinState === 'serviceable' ? (
        <>
          <Text className="text-slate-900 font-extrabold text-xl" numberOfLines={1}>{primary}</Text>
          {secondary ? <Text className="text-slate-400 text-sm mt-0.5" numberOfLines={1}>{secondary}</Text> : null}
        </>
      ) : pinState === 'not_serviceable' ? (
        <>
          <Text className="text-slate-900 font-extrabold text-[17px]">{t('map_not_serviceable_title')}</Text>
          <Text className="text-slate-400 text-[13px] mt-1">{t('map_not_serviceable_sub')}</Text>
        </>
      ) : (
        <>
          <Text className="text-slate-900 font-extrabold text-[17px]">{t('cant_check_area')}</Text>
          <TouchableOpacity onPress={onRetry} className="mt-2">
            <Text className="text-rose-600 font-extrabold text-[14px]">{t('retry')}</Text>
          </TouchableOpacity>
        </>
      )}

      <TouchableOpacity
        onPress={onConfirm}
        disabled={!canConfirm}
        activeOpacity={0.85}
        className={`mt-4 rounded-2xl py-4 items-center justify-center flex-row gap-2 ${canConfirm ? 'bg-rose-600' : 'bg-slate-200'}`}
      >
        {pinState === 'resolving' ? <ActivityIndicator size="small" color="#94a3b8" /> : null}
        <Text className={`font-extrabold text-[15px] ${canConfirm ? 'text-white' : 'text-slate-400'}`}>
          {pinState === 'resolving' ? t('locating_ellipsis') : t('confirm_continue')}
        </Text>
      </TouchableOpacity>
    </View>
  );
};
