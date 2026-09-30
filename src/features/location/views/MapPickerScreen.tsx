// src/features/location/views/MapPickerScreen.tsx
//
// Full-screen Google Maps location picker. The map moves under a fixed center
// pin; every settle resolves to a serviceable village via the view model.

import React, { useCallback, useEffect, useRef } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { PROVIDER_GOOGLE, type Region } from 'react-native-maps';
import { useLocalSearchParams } from 'expo-router';
import { useGuardedRouter } from '@/src/shared/hooks/useGuardedRouter';
import { useSingleFlight } from '@/src/shared/hooks/useSingleFlight';
import { useBackAction } from '@/src/shared/hooks/useBackAction';
import { useScreenFocused } from '@/src/shared/hooks/useScreenActive';
import { ArrowLeft, LocateFixed, Search } from 'lucide-react-native';
import { useTranslation } from '@/src/core/utils/useTranslation';
import { DEFAULT_REGION, useMapPickerViewModel } from '../viewmodel/useMapPickerViewModel';
import { MapPinMarker } from './components/MapPinMarker';
import { useRecenterOnFocus } from './useRecenterOnFocus';
import { LocationInfoSheet } from './components/LocationInfoSheet';
import { PermissionDeniedSheet } from './components/PermissionDeniedSheet';

export const MapPickerScreen = () => {
  const { t } = useTranslation();
  const router = useGuardedRouter();
  const vm = useMapPickerViewModel();
  const mapRef = useRef<MapView | null>(null);
  const focused = useScreenFocused();
  const initialDetectStarted = useRef(false);

  // Set by the search screen when it pops back here with a chosen village.
  // `at` is a per-pick nonce so re-picking the same village still recenters.
  const { lat, lng, at } = useLocalSearchParams<{ lat?: string; lng?: string; at?: string }>();

  useEffect(() => {
    // A pushed screen can mount before navigation marks it focused. Starting
    // only on mount can skip the first iOS permission prompt entirely.
    if (!focused || initialDetectStarted.current) return;
    initialDetectStarted.current = true;
    void vm.initialDetect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focused]);

  // A village picked in the search screen arrives as route params. Recenter on
  // it and re-resolve; the pin's Confirm sheet still does the committing.
  useEffect(() => {
    const latitude = Number(lat);
    const longitude = Number(lng);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
    vm.moveTo({ latitude, longitude });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng, at]);

  // Once the VM produces a region (GPS or fallback), point the camera at it.
  // Google Maps identifies these camera events as non-gestures below.
  useEffect(() => {
    if (vm.region && mapRef.current) {
      mapRef.current.animateToRegion(vm.region, 350);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vm.region?.latitude, vm.region?.longitude]);

  const cancelRecenter = useRecenterOnFocus(mapRef, vm.region);

  const handleRegionChange = (_next: Region, details?: { isGesture?: boolean }) => {
    if (!details?.isGesture) return;
    cancelRecenter();
    vm.onRegionMoving();
  };

  const handleRegionChangeComplete = useCallback(
    (next: Region, details?: { isGesture?: boolean }) => {
      // A sticky "ignore next event" flag can swallow the next real drag when
      // animateToRegion emits no event. Use the native event's origin instead.
      if (details?.isGesture === false) return;
      cancelRecenter();
      vm.onRegionSettled(next);
    },
    [vm, cancelRecenter],
  );

  const goBack = useBackAction(() => router.back());

  const openSearch = () => router.push('/location/search');

  const onConfirm = useSingleFlight(async () => {
    if (await vm.confirm()) router.dismissTo('/(dashboard)/home');
  });

  const onUseCurrent = async () => {
    // Recenter + serviceability are handled inside useCurrentLocation: setRegion
    // drives the camera via the vm.region effect (settle suppressed) and resolve
    // runs directly. No manual animate here, or it would double the camera move.
    await vm.useCurrentLocation();
  };

  const initialRegion: Region = vm.region ?? DEFAULT_REGION;

  return (
    <View className="flex-1 bg-slate-100">
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={{ flex: 1 }}
        initialRegion={initialRegion}
        onRegionChange={handleRegionChange}
        onRegionChangeComplete={handleRegionChangeComplete}
        showsMyLocationButton={false}
        // showsUserLocation is deliberately off: on Fabric its native
        // `topUserLocationChange` events are unregistered and throw app-wide.
      />

      {/* Fixed center pin overlay */}
      <MapPinMarker />

      {/* Floating header controls — kept off an opaque bar so the map stays
          edge-to-edge behind the status bar. */}
      <SafeAreaView edges={['top']} className="absolute left-0 right-0 top-0">
        <View className="flex-row items-center gap-3 px-4 py-3">
          <TouchableOpacity
            onPress={goBack}
            accessibilityLabel={t('back')}
            hitSlop={8}
            className="w-10 h-10 rounded-full bg-white items-center justify-center"
            style={{ shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 6 }}
          >
            <ArrowLeft size={22} color="#0f172a" />
          </TouchableOpacity>
          <View
            className="bg-white rounded-full px-4 py-2"
            style={{ shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 6 }}
          >
            <Text className="text-slate-900 font-bold text-base">{t('location_information')}</Text>
          </View>

          <View className="flex-1" />

          <TouchableOpacity
            onPress={openSearch}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('search_location')}
            className="w-10 h-10 rounded-full bg-white items-center justify-center"
            style={{ shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 6 }}
          >
            <Search size={22} color="#0f172a" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Use current location pill */}
      <TouchableOpacity
        onPress={onUseCurrent}
        disabled={vm.detectingGps}
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
