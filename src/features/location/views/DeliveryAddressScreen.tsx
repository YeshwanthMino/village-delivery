// src/features/location/views/DeliveryAddressScreen.tsx
//
// Delivery-address manager reached from the Cart. List mode lets the user pick a
// saved address or start adding; add mode is a map picker + details form that
// creates the address, selects it, and returns to the Cart.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { PROVIDER_GOOGLE, type Region } from 'react-native-maps';
import { useRouter } from 'expo-router';
import { ArrowLeft, Check, LocateFixed, Plus } from 'lucide-react-native';
import { useTranslation } from '@/src/core/utils/useTranslation';
import { useLocationStore } from '@/src/core/store/useLocationStore';
import { DEFAULT_REGION } from '../viewmodel/useMapPickerViewModel';
import { useAddAddressViewModel } from '../viewmodel/useAddAddressViewModel';
import { MapPinMarker } from './components/MapPinMarker';
import { PermissionDeniedSheet } from './components/PermissionDeniedSheet';
import type { AddressTag } from '../domain/models';

const TAG_EMOJI: Record<AddressTag, string> = { home: '🏠', work: '🏢', other: '📍' };
const TAGS: AddressTag[] = ['home', 'work', 'other'];

export const DeliveryAddressScreen = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const vm = useAddAddressViewModel();
  const map = vm.map;

  const savedAddresses = useLocationStore((s) => s.savedAddresses);
  const selectedAddressId = useLocationStore((s) => s.selectedAddressId);
  const setSelectedAddress = useLocationStore((s) => s.setSelectedAddress);

  const [mode, setMode] = useState<'list' | 'add'>('list');
  const [showForm, setShowForm] = useState(false);

  const mapRef = useRef<MapView | null>(null);
  const suppressSettle = useRef(false);

  // Initialize the camera once when entering add mode.
  useEffect(() => {
    if (mode === 'add') void map.initialDetect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // Point the camera at the VM region; suppress the resulting settle.
  useEffect(() => {
    if (mode === 'add' && map.region && mapRef.current) {
      suppressSettle.current = true;
      mapRef.current.animateToRegion(map.region, 350);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map.region?.latitude, map.region?.longitude, mode]);

  const handleRegionChangeComplete = useCallback(
    (next: Region) => {
      if (suppressSettle.current) { suppressSettle.current = false; return; }
      map.onRegionSettled(next);
      setShowForm(false); // pin moved → require re-confirm
    },
    [map],
  );

  const backToCart = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/cart' as any);
  };

  const goBack = () => {
    if (mode === 'add') { setMode('list'); setShowForm(false); return; }
    backToCart();
  };

  const onSelectExisting = async (id: string) => {
    const a = savedAddresses.find((x) => x.id === id);
    if (!a) return;
    await setSelectedAddress(a);
    backToCart();
  };

  const onUseCurrent = async () => {
    const region = await map.useCurrentLocation();
    if (region && mapRef.current) mapRef.current.animateToRegion(region, 350);
  };

  const onConfirmPin = () => { if (map.pinState === 'serviceable') setShowForm(true); };

  const onSave = async () => {
    if (await vm.save()) backToCart();
  };

  // ── List mode ──────────────────────────────────────────────────────────────
  if (mode === 'list') {
    return (
      <SafeAreaView className="flex-1 bg-slate-50" edges={['top', 'left', 'right']}>
        <View className="flex-row items-center gap-3 px-4 py-3 bg-white border-b border-slate-100">
          <TouchableOpacity onPress={goBack} hitSlop={8} className="w-9 h-9 items-center justify-center">
            <ArrowLeft size={22} color="#0f172a" />
          </TouchableOpacity>
          <Text className="text-slate-900 font-black text-xl">{t('select_delivery_address')}</Text>
        </View>

        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <TouchableOpacity
            onPress={() => setMode('add')}
            activeOpacity={0.85}
            accessibilityRole="button"
            className="flex-row items-center gap-3 bg-white border border-green-200 rounded-2xl px-4 py-4 mb-4"
          >
            <View className="w-9 h-9 rounded-full bg-green-50 items-center justify-center">
              <Plus size={18} color="#16a34a" />
            </View>
            <Text className="flex-1 text-green-700 font-extrabold text-[14px]">{t('add_new_address')}</Text>
          </TouchableOpacity>

          {savedAddresses.length > 0 ? (
            <>
              <Text className="text-slate-500 font-semibold text-xs uppercase mb-3">{t('saved_addresses')}</Text>
              {savedAddresses.map((a) => {
                const active = a.id === selectedAddressId;
                return (
                  <TouchableOpacity
                    key={a.id}
                    onPress={() => onSelectExisting(a.id)}
                    accessibilityRole="button"
                    className={`flex-row items-center rounded-2xl px-4 py-4 mb-3 border ${active ? 'border-green-600 bg-green-50' : 'border-slate-100 bg-white'}`}
                  >
                    <View className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center">
                      <Text className="text-xl leading-none">{TAG_EMOJI[a.tag]}</Text>
                    </View>
                    <Text className="flex-1 ml-3 text-slate-900 text-base" numberOfLines={2}>
                      {[a.addressLine1, a.villageName].filter(Boolean).join(', ')}
                    </Text>
                    {active ? <Check size={18} color="#16a34a" /> : null}
                  </TouchableOpacity>
                );
              })}
            </>
          ) : (
            <Text className="text-slate-400 text-sm text-center mt-8">{t('no_saved_addresses')}</Text>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Add mode ───────────────────────────────────────────────────────────────
  const initialRegion: Region = map.region ?? DEFAULT_REGION;
  const canConfirm = map.pinState === 'serviceable';

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
      <MapPinMarker />

      <SafeAreaView edges={['top']} className="absolute left-0 right-0 top-0">
        <View className="flex-row items-center gap-3 px-4 py-3">
          <TouchableOpacity
            onPress={goBack}
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
            <Text className="text-slate-900 font-bold text-base">{t('add_new_address')}</Text>
          </View>
        </View>
      </SafeAreaView>

      {!showForm ? (
        <TouchableOpacity
          onPress={onUseCurrent}
          activeOpacity={0.85}
          accessibilityRole="button"
          className="absolute right-4 bottom-48 bg-white rounded-full px-4 py-2.5 flex-row items-center gap-2"
          style={{ shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 6 }}
        >
          <LocateFixed size={16} color="#16a34a" />
          <Text className="text-slate-900 font-bold text-[12px]">{t('use_current_location')}</Text>
        </TouchableOpacity>
      ) : null}

      <View
        className="absolute left-0 right-0 bottom-0 bg-white rounded-t-3xl px-5 pt-5 pb-8"
        style={{ shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: -4 }, elevation: 12, maxHeight: '85%' }}
      >
        {!showForm ? (
          <>
            {map.pinState === 'serviceable' ? (
              <>
                <Text className="text-slate-900 font-extrabold text-xl" numberOfLines={1}>{map.primary}</Text>
                {map.secondary ? <Text className="text-slate-400 text-sm mt-0.5" numberOfLines={1}>{map.secondary}</Text> : null}
              </>
            ) : map.pinState === 'resolving' ? (
              <Text className="text-slate-400 font-bold text-[15px]">{t('locating_ellipsis')}</Text>
            ) : (
              <Text className="text-slate-900 font-extrabold text-[15px]">{t('map_not_serviceable_title')}</Text>
            )}
            <TouchableOpacity
              onPress={onConfirmPin}
              disabled={!canConfirm}
              activeOpacity={0.85}
              accessibilityRole="button"
              className={`mt-4 rounded-2xl py-4 items-center ${canConfirm ? 'bg-green-600' : 'bg-slate-200'}`}
            >
              <Text className={`font-extrabold text-[15px] ${canConfirm ? 'text-white' : 'text-slate-400'}`}>
                {t('confirm_location')}
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text className="text-slate-900 font-extrabold text-lg mb-3">{t('address_details')}</Text>

            <TextInput
              value={vm.addressLine1}
              onChangeText={vm.setAddressLine1}
              placeholder={t('flat_house_no')}
              placeholderTextColor="#94a3b8"
              className="border border-slate-200 rounded-xl px-4 py-3 text-slate-900 mb-3"
            />
            <TextInput
              value={vm.landmark}
              onChangeText={vm.setLandmark}
              placeholder={t('landmark_optional')}
              placeholderTextColor="#94a3b8"
              className="border border-slate-200 rounded-xl px-4 py-3 text-slate-900 mb-3"
            />

            <View className="flex-row gap-2 mb-3">
              {TAGS.map((tg) => (
                <TouchableOpacity
                  key={tg}
                  onPress={() => vm.setTag(tg)}
                  accessibilityRole="button"
                  className={`px-4 py-2 rounded-full border ${vm.tag === tg ? 'border-green-600 bg-green-50' : 'border-slate-200 bg-white'}`}
                >
                  <Text className={`font-bold text-[13px] ${vm.tag === tg ? 'text-green-700' : 'text-slate-600'}`}>
                    {TAG_EMOJI[tg]} {t(`address_tag_${tg}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity onPress={() => vm.setIsDefault(!vm.isDefault)} accessibilityRole="checkbox" accessibilityState={{ checked: vm.isDefault }} accessibilityLabel={t('set_as_default')} className="flex-row items-center gap-2 mb-4">
              <View className={`w-5 h-5 rounded border items-center justify-center ${vm.isDefault ? 'bg-green-600 border-green-600' : 'border-slate-300'}`}>
                {vm.isDefault ? <Check size={14} color="#fff" /> : null}
              </View>
              <Text className="text-slate-700 font-semibold text-sm">{t('set_as_default')}</Text>
            </TouchableOpacity>

            {vm.error ? <Text className="text-rose-600 font-bold text-xs mb-2">{vm.error}</Text> : null}

            <TouchableOpacity
              onPress={onSave}
              disabled={!vm.canSave}
              activeOpacity={0.85}
              accessibilityRole="button"
              className={`rounded-2xl py-4 items-center ${vm.canSave ? 'bg-green-600' : 'bg-slate-200'}`}
            >
              <Text className={`font-extrabold text-[15px] ${vm.canSave ? 'text-white' : 'text-slate-400'}`}>
                {vm.saving ? t('saving_ellipsis') : t('save_address')}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </View>

      <PermissionDeniedSheet visible={map.blocked} onClose={map.dismissBlocked} onGoToSettings={map.openSettings} />
    </View>
  );
};
