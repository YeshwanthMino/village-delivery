// src/features/location/views/components/PermissionDeniedSheet.tsx
//
// Shown when location permission is permanently denied (OS won't prompt again).
// Routes the user to system Settings; the viewmodel auto-detects on return.

import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { MapPinOff } from 'lucide-react-native';
import { VillageBottomSheet } from '@/src/shared/components';
import { useTranslation } from '@/src/core/utils/useTranslation';

interface Props {
  visible: boolean;
  onClose: () => void;
  onGoToSettings: () => void;
}

export const PermissionDeniedSheet = ({ visible, onClose, onGoToSettings }: Props) => {
  const { t } = useTranslation();
  return (
    <VillageBottomSheet visible={visible} onClose={onClose}>
      <View className="px-5 pb-4">
        <View className="items-center py-4">
          <MapPinOff size={46} color="#16a34a" />
        </View>
        <Text className="text-slate-900 font-bold text-xl text-center">{t('perm_blocked_title')}</Text>
        <Text className="text-slate-500 text-base text-center mt-2 leading-6">{t('perm_blocked_sub')}</Text>
        <TouchableOpacity onPress={onGoToSettings} className="bg-green-600 rounded-2xl py-4 items-center mt-5">
          <Text className="text-white font-bold text-base">{t('go_to_settings')}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onClose} className="py-3.5 items-center mt-1">
          <Text className="text-slate-500 font-semibold text-base">{t('cancel')}</Text>
        </TouchableOpacity>
      </View>
    </VillageBottomSheet>
  );
};
