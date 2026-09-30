// src/features/location/views/components/NotServiceableView.tsx
//
// Full-screen "we don't deliver here yet" state shown on Home when the resolved
// location is outside any serviceable village. App green theme.

import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MapPin } from 'lucide-react-native';
import { useTranslation } from '@/src/core/utils/useTranslation';
import { LocationPinGraphic } from './LocationPinGraphic';

interface Props {
  onUseAnotherPincode: () => void;
}

export const NotServiceableView = ({ onUseAnotherPincode }: Props) => {
  const { t } = useTranslation();

  return (
    <View className="flex-1 bg-slate-50 px-4 pt-3">
      <LinearGradient
        colors={['#e8f5e9', '#ffffff']}
        style={{ borderRadius: 24, paddingVertical: 32, paddingHorizontal: 20 }}
      >
        <View className="items-center">
          <LocationPinGraphic />
          <Text className="mt-3 text-slate-900 font-extrabold text-lg text-center leading-tight">
            {t('not_serviceable_title')}
          </Text>
          <Text
            className="mt-1.5 text-slate-500 text-[13px] text-center leading-snug"
            style={{ maxWidth: 280 }}
          >
            {t('not_serviceable_sub')}
          </Text>

          <TouchableOpacity
            onPress={onUseAnotherPincode}
            activeOpacity={0.85}
            className="flex-row items-center gap-2 bg-green-600 rounded-2xl px-6 py-3.5 mt-5"
          >
            <MapPin size={18} color="#ffffff" />
            <Text className="text-white font-extrabold text-[15px]">{t('use_another_pincode')}</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );
};
