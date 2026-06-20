// src/features/location/views/LocationPermissionSheet.tsx
//
// First-open / permission-off location sheet (Zepto / Blinkit style).
// Visual: Village Delivery design's LocationPermissionSheet.

import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight, Search } from 'lucide-react-native';
import { VillageBottomSheet } from '@/src/shared/components';
import { useTranslation } from '@/src/core/utils/useTranslation';
import { AddressTag } from '../domain/models';
import { useLocationViewModel } from '../viewmodel/useLocationViewModel';
import { useAddressBookViewModel } from '../viewmodel/useAddressBookViewModel';
import { LocationPinGraphic } from './components/LocationPinGraphic';
import { UseCurrentLocationRow } from './components/UseCurrentLocationRow';
import { PermissionDeniedSheet } from './components/PermissionDeniedSheet';

interface Props {
  visible: boolean;
  onClose: () => void;
  /** When false the user can't swipe/tap-away — forces picking a location. */
  dismissable?: boolean;
}

const TAG_EMOJI: Record<AddressTag, string> = { home: '🏠', work: '🏢', other: '📍' };

export const LocationPermissionSheet = ({ visible, onClose, dismissable = true }: Props) => {
  const { t } = useTranslation();
  const router = useRouter();
  const vm = useLocationViewModel();
  const book = useAddressBookViewModel();
  const denied = vm.permission === 'denied';
  const granted = vm.permission === 'granted';
  const hasError = vm.lastError !== null;

  const run = async (p: Promise<boolean>) => {
    if (await p) onClose();
  };

  const openSearch = () => {
    onClose();
    router.push('/location' as any);
  };

  return (
    <>
      <VillageBottomSheet visible={visible} onClose={onClose} dismissable={dismissable}>
        {/* Hero */}
        <LinearGradient colors={['#e8f5e9', '#ffffff']} style={{ paddingTop: 24, paddingBottom: 20 }}>
          <View className="items-center px-6">
            <LocationPinGraphic />
            <Text className="mt-3 text-slate-900 font-extrabold text-lg text-center leading-tight">
              {denied
                ? t('location_blocked_title')
                : granted
                  ? t('select_delivery_location')
                  : t('permission_off_title')}
            </Text>
            <Text className="mt-1.5 text-slate-500 text-[13px] text-center leading-snug" style={{ maxWidth: 260 }}>
              {granted && !denied ? t('set_location_prompt') : t('permission_off_sub')}
            </Text>
          </View>
        </LinearGradient>

        <View className="px-4 pt-3 pb-2">
          {/* Use my Current Location */}
          <View className="mb-4">
            <UseCurrentLocationRow
              permission={vm.permission}
              loading={vm.detecting}
              onPress={() => run(vm.detectCurrentLocation())}
            />

            {hasError && !vm.detecting ? (
              <View className="px-4 py-3 mt-2 bg-red-50 border border-red-100 rounded-xl flex-row items-center gap-3">
                <Text className="flex-1 text-red-700 font-medium text-[12px] leading-snug">
                  {t('location_error_title')}
                </Text>
                <TouchableOpacity
                  onPress={() => run(vm.detectCurrentLocation())}
                  className="border border-red-300 bg-white px-3 py-1.5 rounded-lg"
                >
                  <Text className="text-red-700 font-extrabold text-[11px]">{t('retry')}</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {vm.blocked ? (
              <TouchableOpacity
                onPress={vm.openSettings}
                className="px-4 py-3 mt-2 bg-amber-50 border border-amber-100 rounded-xl flex-row items-center justify-between"
              >
                <Text className="flex-1 text-amber-800 font-medium text-[11.5px] leading-snug">
                  {t('location_blocked_title')}
                </Text>
                <Text className="text-amber-900 font-extrabold text-[11px] underline ml-3">
                  {t('open_settings')}
                </Text>
              </TouchableOpacity>
            ) : denied && !hasError ? (
              <View className="px-4 py-2.5 mt-2 bg-amber-50 border border-amber-100 rounded-xl">
                <Text className="text-amber-800 font-medium text-[11.5px] leading-snug">
                  {t('location_denied_inline')}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Saved addresses (auth only) */}
          {book.isAuthenticated && book.addresses.length > 0 ? (
            <>
              <Text className="text-slate-900 font-extrabold text-sm mb-2.5">{t('select_your_address')}</Text>
              <View className="bg-white border border-slate-200 rounded-2xl overflow-hidden mb-3">
                {book.addresses.map((a, i) => (
                  <TouchableOpacity
                    key={a.id}
                    onPress={() => run(vm.selectAddress(a))}
                    className={`flex-row items-center gap-3 px-4 py-3.5 ${i > 0 ? 'border-t border-slate-100' : ''}`}
                  >
                    <View className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center">
                      <Text className="text-xl leading-none">{TAG_EMOJI[a.tag]}</Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-slate-900 font-extrabold text-[13.5px]" numberOfLines={1}>
                        {[a.addressLine1, a.villageName].filter(Boolean).join(', ')}
                      </Text>
                      {a.landmark ? (
                        <Text className="text-slate-500 text-[11.5px] mt-0.5" numberOfLines={1}>{a.landmark}</Text>
                      ) : null}
                    </View>
                    <ChevronRight size={16} color="#94a3b8" />
                  </TouchableOpacity>
                ))}
              </View>
            </>
          ) : null}

          {/* Search → full Select Location screen */}
          <TouchableOpacity
            onPress={openSearch}
            className="bg-white border border-slate-200 rounded-2xl px-4 py-3.5 flex-row items-center gap-3 mb-2"
          >
            <Search size={20} color="#64748b" />
            <Text className="flex-1 text-slate-700 font-bold text-sm">{t('search_your_location')}</Text>
          </TouchableOpacity>
        </View>
      </VillageBottomSheet>

      <PermissionDeniedSheet
        visible={vm.blocked}
        onClose={vm.dismissBlocked}
        onGoToSettings={vm.openSettings}
      />
    </>
  );
};
