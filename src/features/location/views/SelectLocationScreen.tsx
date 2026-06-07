// src/features/location/views/SelectLocationScreen.tsx

import React from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronRight, Phone, Search } from 'lucide-react-native';
import { useTranslation } from '@/src/core/utils/useTranslation';
import { useSelectLocationViewModel } from '../viewmodel/useSelectLocationViewModel';
import { CurrentLocationRow } from './components/CurrentLocationRow';

export const SelectLocationScreen = () => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const vm = useSelectLocationViewModel();
  const loading = vm.status === 'locating' || vm.status === 'checking';

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'left', 'right']}>
      <View className="px-5 pt-2">
        <Text className="text-slate-900 font-bold text-2xl mb-5">{t('select_location')}</Text>

        {/* Search (inert when logged out — GPS-only) */}
        <View className="flex-row items-center border border-slate-200 rounded-2xl px-4 py-3">
          <Search size={20} color="#94a3b8" />
          <TextInput
            value={vm.search}
            onChangeText={vm.setSearch}
            editable={vm.searchEnabled}
            placeholder={t('search_address_ph')}
            placeholderTextColor="#94a3b8"
            className="flex-1 ml-3 text-slate-900 text-base"
          />
        </View>
      </View>

      <View className="bg-slate-50 flex-1 mt-5 px-5 pt-5" style={{ paddingBottom: insets.bottom }}>
        <CurrentLocationRow
          title={t('use_current_location')}
          subtitle={t('current_location_sub')}
          cta={t('enable')}
          loading={loading}
          onPress={vm.useCurrentLocation}
        />

        <TouchableOpacity
          onPress={vm.requestFromFriend}
          className="flex-row items-center bg-white rounded-2xl px-4 py-4 mt-4"
        >
          <Phone size={20} color="#16a34a" />
          <Text className="flex-1 ml-3 text-slate-900 font-semibold text-base">
            {t('request_from_friend')}
          </Text>
          <ChevronRight size={20} color="#94a3b8" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};
