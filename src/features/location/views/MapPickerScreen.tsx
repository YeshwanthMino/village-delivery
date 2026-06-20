// src/features/location/views/MapPickerScreen.tsx
//
// Full-screen Google Maps location picker. The map moves under a fixed center
// pin; every settle resolves to a serviceable village via the view model.

import React, { useCallback, useEffect, useRef } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { PROVIDER_GOOGLE, type Region } from 'react-native-maps';
import { useRouter } from 'expo-router';
import { ArrowLeft, LocateFixed } from 'lucide-react-native';
import { useTranslation } from '@/src/core/utils/useTranslation';
import { DEFAULT_REGION, useMapPickerViewModel } from '../viewmodel/useMapPickerViewModel';
import { MapPinMarker } from './components/MapPinMarker';
import { LocationInfoSheet } from './components/LocationInfoSheet';
import { PermissionDeniedSheet } from './components/PermissionDeniedSheet';

export const MapPickerScreen = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const vm = useMapPickerViewModel();
  const mapRef = useRef<MapView | null>(null);
  const suppressSettle = useRef(false);

  useEffect(() => {
    void vm.initialDetect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Once the VM produces a region (GPS or fallback), point the camera at it.
  // Suppress the resulting onRegionChangeComplete so programmatic moves don't
  // trigger a redundant resolve (initialDetect / fallbackRegion resolve directly).
  useEffect(() => {
    if (vm.region && mapRef.current) {
      suppressSettle.current = true;
      mapRef.current.animateToRegion(vm.region, 350);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vm.region?.latitude, vm.region?.longitude]);

  const handleRegionChangeComplete = useCallback(
    (next: Region) => {
      if (suppressSettle.current) {
        suppressSettle.current = false;
        return;
      }
      vm.onRegionSettled(next);
    },
    [vm],
  );

  const goHome = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(dashboard)/home' as any);
  };

  const onConfirm = async () => {
    if (await vm.confirm()) router.replace('/(dashboard)/home' as any);
  };

  const onUseCurrent = async () => {
    const region = await vm.useCurrentLocation();
    if (region && mapRef.current) mapRef.current.animateToRegion(region, 350);
  };

  const initialRegion: Region = vm.region ?? DEFAULT_REGION;

  return (
    <View className="flex-1 bg-slate-100">
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={{ flex: 1 }}
        initialRegion={initialRegion}
        onRegionChangeComplete={handleRegionChangeComplete}
        showsMyLocationButton={false}
        showsUserLocation
      />

      {/* Fixed center pin overlay */}
      <MapPinMarker />

      {/* Header */}
      <SafeAreaView edges={['top']} className="absolute left-0 right-0 top-0">
        <View className="bg-white/95 flex-row items-center gap-3 px-4 py-3">
          <TouchableOpacity onPress={goHome} hitSlop={8} className="w-9 h-9 -ml-1 rounded-full items-center justify-center">
            <ArrowLeft size={24} color="#0f172a" />
          </TouchableOpacity>
          <Text className="text-slate-900 font-bold text-lg">{t('location_information')}</Text>
        </View>
      </SafeAreaView>

      {/* Use current location pill */}
      <TouchableOpacity
        onPress={onUseCurrent}
        activeOpacity={0.85}
        className="absolute right-4 bottom-48 bg-white rounded-full px-4 py-2.5 flex-row items-center gap-2"
        style={{ shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 6 }}
      >
        <LocateFixed size={16} color="#16a34a" />
        <Text className="text-slate-900 font-bold text-[12px]">{t('use_current_location')}</Text>
      </TouchableOpacity>

      <LocationInfoSheet
        pinState={vm.pinState}
        primary={vm.primary}
        secondary={vm.secondary}
        onConfirm={onConfirm}
        onRetry={vm.retry}
      />

      <PermissionDeniedSheet
        visible={vm.blocked}
        onClose={vm.dismissBlocked}
        onGoToSettings={vm.openSettings}
      />
    </View>
  );
};
