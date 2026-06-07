// src/features/location/views/LocationEntrySheet.tsx

import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { MapPin, Phone, Search } from 'lucide-react-native';
import { VillageBottomSheet } from '@/src/shared/components';
import { useTranslation } from '@/src/core/utils/useTranslation';
import { useSelectLocationViewModel } from '../viewmodel/useSelectLocationViewModel';
import { CurrentLocationRow } from './components/CurrentLocationRow';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export const LocationEntrySheet = ({ visible, onClose }: Props) => {
  const { t } = useTranslation();
  const vm = useSelectLocationViewModel();
  const loading = vm.status === 'locating' || vm.status === 'checking';

  return (
    <VillageBottomSheet visible={visible} onClose={onClose}>
      <View className="px-5 pb-4">
        <View className="items-center py-4">
          <MapPin size={48} color="#16a34a" fill="#dcfce7" />
        </View>
        <Text className="text-slate-900 font-bold text-xl text-center">{t('permission_off_title')}</Text>
        <Text className="text-slate-500 text-base text-center mt-2 leading-6">
          {t('permission_off_sub')}
        </Text>

        <View className="mt-5 border border-slate-100 rounded-2xl overflow-hidden">
          <CurrentLocationRow
            title={t('use_current_location')}
            subtitle={t('current_location_sub')}
            cta={t('enable')}
            loading={loading}
            onPress={vm.useCurrentLocation}
          />
          <View className="h-px bg-slate-100" />
          <TouchableOpacity onPress={vm.requestFromFriend} className="flex-row items-center bg-white px-4 py-4">
            <Phone size={20} color="#16a34a" />
            <Text className="flex-1 ml-3 text-slate-900 font-semibold text-base">
              {t('request_from_friend')}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity className="flex-row items-center justify-center border border-slate-200 rounded-2xl px-4 py-3.5 mt-4">
          <Search size={20} color="#64748b" />
          <Text className="ml-2 text-slate-700 font-semibold text-base">{t('search_your_location')}</Text>
        </TouchableOpacity>
      </View>
    </VillageBottomSheet>
  );
};
