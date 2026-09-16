// src/features/location/views/components/PinTooltip.tsx
//
// Dark floating bubble shown above the fixed center pin. Pure presentational.

import React from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from '@/src/core/utils/useTranslation';

export const PinTooltip = () => {
  const { t } = useTranslation();
  return (
    <View className="items-center">
      <View className="bg-slate-900 rounded-2xl px-4 py-2.5 max-w-[260px]">
        <Text className="text-white font-extrabold text-[14px] text-center">
          {t('delivered_here_title')}
        </Text>
        <Text className="text-slate-300 text-[12px] text-center mt-0.5">
          {t('delivered_here_sub')}
        </Text>
      </View>
      {/* tail */}
      <View className="w-3 h-3 bg-slate-900 rotate-45 -mt-1.5" />
    </View>
  );
};
