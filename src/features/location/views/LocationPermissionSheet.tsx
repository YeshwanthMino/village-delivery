// src/features/location/views/LocationPermissionSheet.tsx
//
// First-open / permission-off location sheet (Zepto / Blinkit style).
// Visual: Village Delivery design's LocationPermissionSheet.

import React from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight, LocateFixed, Search } from 'lucide-react-native';
import { VillageBottomSheet } from '@/src/shared/components';
import { useTranslation } from '@/src/core/utils/useTranslation';
import { AddressTag } from '../domain/models';
import { useLocationViewModel } from '../viewmodel/useLocationViewModel';
import { useAddressBookViewModel } from '../viewmodel/useAddressBookViewModel';
import { LocationPinGraphic } from './components/LocationPinGraphic';
import { PermissionDeniedSheet } from './components/PermissionDeniedSheet';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const TAG_EMOJI: Record<AddressTag, string> = { home: '🏠', work: '🏢', other: '📍' };

export const LocationPermissionSheet = ({ visible, onClose }: Props) => {
  const { t } = useTranslation();
  const vm = useLocationViewModel();
  const book = useAddressBookViewModel();
  const [search, setSearch] = React.useState('');
  const denied = vm.permission === 'denied';

  const run = async (p: Promise<boolean>) => {
    if (await p) onClose();
  };

  return (
    <>
      <VillageBottomSheet visible={visible} onClose={onClose}>
        {/* Hero */}
        <LinearGradient colors={['#e8f5e9', '#ffffff']} style={{ paddingTop: 24, paddingBottom: 20 }}>
          <View className="items-center px-6">
            <LocationPinGraphic />
            <Text className="mt-3 text-slate-900 font-extrabold text-lg text-center leading-tight">
              {denied ? t('location_blocked_title') : t('permission_off_title')}
            </Text>
            <Text className="mt-1.5 text-slate-500 text-[13px] text-center leading-snug" style={{ maxWidth: 260 }}>
              {t('permission_off_sub')}
            </Text>
          </View>
        </LinearGradient>

        <View className="px-4 pt-3 pb-2">
          {/* Use my Current Location */}
          <View className="bg-white border border-slate-200 rounded-2xl overflow-hidden mb-4">
            <View className="flex-row items-center gap-3 px-4 py-3.5">
              <View className="w-9 h-9 rounded-full bg-green-50 items-center justify-center">
                <LocateFixed size={18} color="#16a34a" />
              </View>
              <Text className="flex-1 text-slate-900 font-bold text-sm">{t('use_current_location')}</Text>
              <TouchableOpacity
                onPress={() => run(vm.detectCurrentLocation())}
                disabled={vm.detecting}
                className="bg-green-600 px-4 py-2 rounded-xl"
              >
                <Text className="text-white font-extrabold text-xs tracking-wide">
                  {denied ? t('try_again') : t('enable')}
                </Text>
              </TouchableOpacity>
            </View>
            {denied ? (
              <View className="px-4 py-2.5 bg-amber-50 border-t border-amber-100">
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

          {/* Search */}
          <View className="bg-white border border-slate-200 rounded-2xl px-4 py-1 flex-row items-center gap-3 mb-2">
            <Search size={20} color="#64748b" />
            <TextInput
              value={search}
              onChangeText={setSearch}
              onSubmitEditing={() => run(vm.searchLocation(search))}
              returnKeyType="search"
              placeholder={t('search_your_location')}
              placeholderTextColor="#64748b"
              className="flex-1 text-slate-800 font-medium text-sm py-3"
            />
          </View>
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
