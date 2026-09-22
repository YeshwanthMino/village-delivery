// src/features/notifications/views/NotificationPermissionSheet.tsx
//
// First-ask notification permission sheet. Mirrors the location permission
// sheet's rule: the OS dialog only fires from a user tap inside this
// explainer, never automatically.

import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Bell } from 'lucide-react-native';
import { VillageBottomSheet } from '@/src/shared/components';
import { useTranslation } from '@/src/core/utils/useTranslation';
import { useNotificationViewModel } from '../viewmodel/useNotificationViewModel';
import { NotificationBlockedSheet } from './components/NotificationBlockedSheet';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export const NotificationPermissionSheet = ({ visible, onClose }: Props) => {
  const { t } = useTranslation();
  const vm = useNotificationViewModel();

  const handleAllow = async () => {
    await vm.requestPermission();
    onClose();
  };

  return (
    <>
      <VillageBottomSheet visible={visible} onClose={onClose}>
        <View className="items-center px-6 pt-6 pb-4">
          <Bell size={40} color="#16a34a" />
          <Text className="mt-3 text-slate-900 font-extrabold text-lg text-center leading-tight">
            {t('notif_permission_title')}
          </Text>
          <Text className="mt-1.5 text-slate-500 text-[13px] text-center leading-snug" style={{ maxWidth: 260 }}>
            {t('notif_permission_sub')}
          </Text>
        </View>
        <View className="px-4 pb-4">
          <TouchableOpacity onPress={handleAllow} className="bg-green-600 rounded-2xl py-4 items-center">
            <Text className="text-white font-bold text-base">{t('allow_notifications')}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} className="py-3.5 items-center mt-1">
            <Text className="text-slate-500 font-semibold text-base">{t('not_now')}</Text>
          </TouchableOpacity>
        </View>
      </VillageBottomSheet>

      <NotificationBlockedSheet
        visible={vm.blocked}
        onClose={vm.dismissBlocked}
        onGoToSettings={vm.openSettings}
      />
    </>
  );
};
