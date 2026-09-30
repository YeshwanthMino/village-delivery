// src/features/location/views/DeliveryAddressScreen.tsx
//
// Delivery-address manager reached from the Cart. List mode lets the user pick a
// saved address or start adding; add mode is a map picker + details form that
// creates the address, selects it, and returns to the Cart.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { PROVIDER_GOOGLE, type Region } from 'react-native-maps';
import { useLocalSearchParams } from 'expo-router';
import { useGuardedRouter } from '@/src/shared/hooks/useGuardedRouter';
import { useSingleFlight } from '@/src/shared/hooks/useSingleFlight';
import { useBackAction } from '@/src/shared/hooks/useBackAction';
import { useScreenFocused } from '@/src/shared/hooks/useScreenActive';
import { AddressBackGuard } from './AddressBackGuard';
import { ArrowLeft, Briefcase, Check, Home, LocateFixed, MapPin, Pencil, Plus, Search, Trash2 } from 'lucide-react-native';
import { useTranslation } from '@/src/core/utils/useTranslation';
import { useLocationStore } from '@/src/core/store/useLocationStore';
import { DEFAULT_REGION } from '../viewmodel/useMapPickerViewModel';
import { useAddAddressViewModel } from '../viewmodel/useAddAddressViewModel';
import { MapPinMarker } from './components/MapPinMarker';
import { useRecenterOnFocus } from './useRecenterOnFocus';
import { PermissionDeniedSheet } from './components/PermissionDeniedSheet';
import { ConfirmDialog } from '@/src/shared/components/ConfirmDialog';
import { deleteAddress } from '../data/locationApi';
import type { Address, AddressTag } from '../domain/models';

const TAG_ICON: Record<AddressTag, React.ComponentType<{ size?: number; color?: string }>> = {
  home: Home,
  work: Briefcase,
  other: MapPin,
};
const TAGS: AddressTag[] = ['home', 'work', 'other'];

export const DeliveryAddressScreen = () => {
  const { t } = useTranslation();
  const router = useGuardedRouter();

  // "Manage" mode is reached from the profile address book: rows are read-only
  // (edit/delete only), with no tap-to-select and no selected highlight. The
  // cart entry point omits this flag, so addresses stay pickable there.
  const { manage, lat, lng, at } = useLocalSearchParams<{
    manage?: string;
    lat?: string;
    lng?: string;
    at?: string;
  }>();
  const manageMode = manage === '1';

  const savedAddresses = useLocationStore((s) => s.savedAddresses);
  const selectedAddressId = useLocationStore((s) => s.selectedAddressId);
  const setSelectedAddress = useLocationStore((s) => s.setSelectedAddress);
  const setSavedAddresses = useLocationStore((s) => s.setSavedAddresses);

  // Land straight on the map when there is nothing to pick from (e.g. right
  // after first login); returning users with saved addresses see the list.
  const [mode, setMode] = useState<'list' | 'add'>(savedAddresses.length === 0 ? 'add' : 'list');
  const enteredFromList = useRef(savedAddresses.length > 0);
  const leaving = useRef(false);
  const interaction = useRef(0);
  const focused = useScreenFocused();
  useEffect(() => () => { interaction.current++; }, [focused]);
  const [showForm, setShowForm] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Address | null>(null);
  const vm = useAddAddressViewModel(mode === 'add');
  const map = vm.map;

  const mapRef = useRef<MapView | null>(null);
  const initialDetectStarted = useRef(false);

  // Initialize once per add-mode entry, after navigation focuses the screen.
  // iOS can mount this screen before focus; an earlier attempt would return
  // without requesting permission and never retry on focus.
  useEffect(() => {
    if (mode !== 'add') {
      initialDetectStarted.current = false;
      return;
    }
    if (!focused || vm.editingId || initialDetectStarted.current) return;
    initialDetectStarted.current = true;
    void map.initialDetect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, focused, vm.editingId]);

  // Point the camera at the VM region; native non-gesture events are ignored.
  useEffect(() => {
    if (mode === 'add' && map.region && mapRef.current) {
      mapRef.current.animateToRegion(map.region, 350);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map.region?.latitude, map.region?.longitude, mode]);

  // A village picked in the search screen arrives as route params. Recenter the
  // pin on it; `at` is a per-pick nonce so re-picking the same village still
  // moves. The pin's Confirm still does the committing.
  useEffect(() => {
    const latitude = Number(lat);
    const longitude = Number(lng);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
    map.moveTo({ latitude, longitude });
    setShowForm(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng, at]);

  const openSearch = () => router.push({
    pathname: '/location/search',
    params: { returnTo: '/address/add', ...(manageMode ? { manage: '1' } : {}) },
  });

  const cancelRecenter = useRecenterOnFocus(mapRef, map.region, mode === 'add');

  const handleRegionChange = (_next: Region, details?: { isGesture?: boolean }) => {
    if (!details?.isGesture) return;
    cancelRecenter();
    map.onRegionMoving();
    setShowForm(false);
  };

  const handleRegionChangeComplete = useCallback(
    (next: Region, details?: { isGesture?: boolean }) => {
      if (details?.isGesture === false) return;
      cancelRecenter();
      map.onRegionSettled(next);
      setShowForm(false); // pin moved → require re-confirm
    },
    [map, cancelRecenter],
  );

  const leaveScreen = () => {
    leaving.current = true;
    router.back(manageMode ? '/(dashboard)/profile' : '/cart');
  };

  const goBack = useBackAction(() => {
    if (vm.saving) return;
    interaction.current++;
    if (mode === 'add' && showForm) { setShowForm(false); return; }
    if (mode === 'add' && enteredFromList.current) { setMode('list'); vm.reset(); return; }
    leaveScreen();
  });
  const backGuard = <AddressBackGuard
    enabled={focused && (vm.saving || (mode === 'add' && (showForm || enteredFromList.current)))}
    leaving={leaving}
    onBack={goBack}
  />;

  const onSelectExisting = useSingleFlight(async (id: string) => {
    const a = savedAddresses.find((x) => x.id === id);
    if (!a) return;
    const token = interaction.current;
    await setSelectedAddress(a);
    if (token === interaction.current) leaveScreen();
  });

  const onUseCurrent = async () => {
    await map.useCurrentLocation();
  };

  const onConfirmPin = () => { if (map.isCurrentPin() && map.pinState === 'serviceable') setShowForm(true); };

  const onEdit = (a: Address) => {
    enteredFromList.current = true;
    interaction.current++;
    vm.beginEdit(a);
    setShowForm(true);
    setMode('add');
  };

  const onDelete = (a: Address) => setPendingDelete(a);

  const onConfirmDelete = useSingleFlight(async () => {
    const a = pendingDelete;
    setPendingDelete(null);
    if (!a) return;
    try {
      await deleteAddress(a.id);
      setSavedAddresses(useLocationStore.getState().savedAddresses.filter((x) => x.id !== a.id));
    } catch {
      Alert.alert('Error', 'Could not delete address.');
    }
  });

  const onSave = useSingleFlight(async () => {
    const token = interaction.current;
    const editing = !!vm.editingId;
    if (await vm.save() && token === interaction.current) {
      if (editing) { setMode('list'); setShowForm(false); vm.reset(); }
      else leaveScreen();
    }
  });

  // ── List mode ──────────────────────────────────────────────────────────────
  if (mode === 'list') {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={['top', 'left', 'right']}>
        {backGuard}
        <View className="flex-row items-center gap-3 px-4 py-3 bg-white border-b border-slate-100">
          <TouchableOpacity onPress={goBack} accessibilityLabel={t('back')} hitSlop={8} className="w-9 h-9 items-center justify-center">
            <ArrowLeft size={22} color="#0f172a" />
          </TouchableOpacity>
          <Text className="text-slate-900 font-black text-xl">{t('select_delivery_address')}</Text>
        </View>

        <ScrollView className="flex-1 bg-slate-50" contentContainerStyle={{ padding: 16 }}>
          <TouchableOpacity
            onPress={() => { enteredFromList.current = true; interaction.current++; setMode('add'); }}
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
                const active = !manageMode && a.id === selectedAddressId;
                const TagIcon = TAG_ICON[a.tag];
                return (
                  <View
                    key={a.id}
                    className={`flex-row items-center rounded-2xl px-3 py-3 mb-3 border ${active ? 'border-green-600 bg-green-50' : 'border-slate-100 bg-white'}`}
                  >
                    <TouchableOpacity
                      onPress={() => onSelectExisting(a.id)}
                      disabled={manageMode}
                      activeOpacity={manageMode ? 1 : 0.2}
                      accessibilityRole={manageMode ? 'text' : 'button'}
                      className="flex-1 flex-row items-center"
                    >
                      <View className={`w-9 h-9 rounded-full items-center justify-center ${active ? 'bg-green-100' : 'bg-slate-100'}`}>
                        <TagIcon size={18} color={active ? '#16a34a' : '#475569'} />
                      </View>
                      <Text className="flex-1 ml-3 text-slate-900 text-base" numberOfLines={2}>
                        {[a.addressLine1, a.villageName].filter(Boolean).join(', ')}
                      </Text>
                      {active ? <Check size={18} color="#16a34a" /> : null}
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => onEdit(a)}
                      hitSlop={6}
                      accessibilityRole="button"
                      accessibilityLabel={t('edit_address')}
                      className="w-9 h-9 ml-1 rounded-lg bg-slate-100 items-center justify-center"
                    >
                      <Pencil size={15} color="#0f172a" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => onDelete(a)}
                      hitSlop={6}
                      accessibilityRole="button"
                      accessibilityLabel={t('delete_address')}
                      className="w-9 h-9 ml-1 rounded-lg bg-red-50 items-center justify-center"
                    >
                      <Trash2 size={15} color="#dc2626" />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </>
          ) : (
            <Text className="text-slate-400 text-sm text-center mt-8">{t('no_saved_addresses')}</Text>
          )}
        </ScrollView>

        <ConfirmDialog
          visible={!!pendingDelete}
          title={t('delete_address_confirm')}
          message={t('delete_address_body')}
          confirmLabel={t('delete_address')}
          cancelLabel={t('cancel')}
          tone="danger"
          onConfirm={onConfirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      </SafeAreaView>
    );
  }

  // ── Add mode ───────────────────────────────────────────────────────────────
  const initialRegion: Region = map.region ?? DEFAULT_REGION;
  const canConfirm = map.pinState === 'serviceable';

  return (
    <View className="flex-1 bg-slate-100">
      {backGuard}
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
      <MapPinMarker />

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
            <Text className="text-slate-900 font-bold text-base">
              {vm.editingId ? t('edit_address_title') : t('add_new_address')}
            </Text>
          </View>

          <View className="flex-1" />

          <TouchableOpacity
            onPress={openSearch}
            disabled={vm.saving}
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

      {!showForm ? (
        <TouchableOpacity
          onPress={onUseCurrent}
          disabled={map.detectingGps}
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
              {TAGS.map((tg) => {
                const TagIcon = TAG_ICON[tg];
                const tagActive = vm.tag === tg;
                return (
                  <TouchableOpacity
                    key={tg}
                    onPress={() => vm.setTag(tg)}
                    accessibilityRole="button"
                    className={`flex-row items-center gap-1.5 px-4 py-2 rounded-full border ${tagActive ? 'border-green-600 bg-green-50' : 'border-slate-200 bg-white'}`}
                  >
                    <TagIcon size={15} color={tagActive ? '#15803d' : '#475569'} />
                    <Text className={`font-bold text-[13px] ${tagActive ? 'text-green-700' : 'text-slate-600'}`}>
                      {t(`address_tag_${tg}`)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
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
