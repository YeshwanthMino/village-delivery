// src/features/location/views/LocationGateScreen.tsx

import React from 'react';
import { ActivityIndicator, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from '@/src/core/utils/useTranslation';
import { useLocationStore } from '@/src/core/store/useLocationStore';
import { SelectLocationScreen } from './SelectLocationScreen';
import { NotServiceableView } from './components/NotServiceableView';
import { useLocationGateViewModel } from '../viewmodel/useLocationGateViewModel';

export const LocationGateScreen = () => {
  const { t } = useTranslation();
  const status = useLocationStore((s) => s.status);
  const setStatus = useLocationStore((s) => s.setStatus);
  const gate = useLocationGateViewModel();

  if (status === 'serviceable') {
    // Gate released — AppScreen's guard redirects off /location to home.
    // Render nothing here; do not navigate during render.
    return null;
  }

  if (status === 'locating' || status === 'checking') {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#16a34a" />
        <Text className="text-slate-500 text-base mt-4">{t('locating')}</Text>
      </SafeAreaView>
    );
  }

  if (status === 'error') {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <NotServiceableView
          title={t('location_error_title')}
          subtitle={t('not_serviceable_sub')}
          ctaLabel={t('retry')}
          onUseAnotherPincode={gate.retry}
        />
      </SafeAreaView>
    );
  }

  if (status === 'not_serviceable') {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <NotServiceableView
          title={t('not_serviceable_title')}
          subtitle={t('not_serviceable_sub')}
          ctaLabel={t('use_another_pincode')}
          onUseAnotherPincode={() => setStatus('idle')}
        />
      </SafeAreaView>
    );
  }

  // idle
  return <SelectLocationScreen />;
};
