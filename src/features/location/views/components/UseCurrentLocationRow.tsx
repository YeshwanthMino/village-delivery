// src/features/location/views/components/UseCurrentLocationRow.tsx
//
// "Use my Current Location" control (Zepto / Blinkit style).
// - Permission NOT granted (undetermined/denied) → shows an "Enable" button;
//   tapping it triggers the OS permission dialog.
// - Permission granted → no Enable button; the whole row detects directly.

import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { LocateFixed, Navigation } from 'lucide-react-native';
import { useTranslation } from '@/src/core/utils/useTranslation';
import { PermissionState } from '../../data/LocationService';

interface Props {
  permission: PermissionState;
  loading?: boolean;
  onPress: () => void;
}

export const UseCurrentLocationRow = ({ permission, loading, onPress }: Props) => {
  const { t } = useTranslation();
  const granted = permission === 'granted';
  const denied = permission === 'denied';

  return (
    <TouchableOpacity
      activeOpacity={granted ? 0.7 : 1}
      onPress={granted ? onPress : undefined}
      disabled={loading}
      className="flex-row items-center gap-3 bg-white border border-slate-200 rounded-2xl px-4 py-3.5"
    >
      <View className="w-9 h-9 rounded-full bg-green-50 items-center justify-center">
        <LocateFixed size={18} color="#16a34a" />
      </View>
      <View className="flex-1">
        <Text className="text-green-700 font-extrabold text-[14px]">{t('use_current_location')}</Text>
        <Text className="text-slate-500 text-[12px] mt-0.5" numberOfLines={2}>
          {granted ? t('detect_via_gps') : t('current_location_sub')}
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator size="small" color="#16a34a" />
      ) : granted ? (
        <Navigation size={20} color="#16a34a" />
      ) : (
        <TouchableOpacity
          onPress={onPress}
          className="border border-green-600 bg-white px-4 py-2 rounded-xl"
        >
          <Text className="text-green-700 font-extrabold text-xs tracking-wide">
            {denied ? t('try_again') : t('enable')}
          </Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};
