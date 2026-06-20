// src/features/location/views/SelectLocationScreen.tsx
//
// Full-screen location picker reached from the "Search your Location" button.
// Search Address (visual placeholder, behavior deferred) + Use my Current Location
// + saved addresses + recent locations.

import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Clock, MapPin, Search } from 'lucide-react-native';
import { useTranslation } from '@/src/core/utils/useTranslation';
import { AddressTag } from '../domain/models';
import { useLocationViewModel } from '../viewmodel/useLocationViewModel';
import { useAddressBookViewModel } from '../viewmodel/useAddressBookViewModel';
import { UseCurrentLocationRow } from './components/UseCurrentLocationRow';
import { PermissionDeniedSheet } from './components/PermissionDeniedSheet';

const TAG_EMOJI: Record<AddressTag, string> = { home: '🏠', work: '🏢', other: '📍' };

export const SelectLocationScreen = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const vm = useLocationViewModel();
  const book = useAddressBookViewModel();

  const goHome = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(dashboard)/home' as any);
  };

  const run = async (p: Promise<boolean>) => {
    if (await p) goHome();
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top', 'left', 'right']}>
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {/* Header + search */}
        <View className="bg-white px-5 pt-2 pb-5">
          <View className="flex-row items-center gap-3 mb-5">
            <TouchableOpacity
              onPress={goHome}
              hitSlop={8}
              className="w-10 h-10 -ml-2 rounded-full items-center justify-center"
            >
              <ArrowLeft size={24} color="#0f172a" />
            </TouchableOpacity>
            <Text className="text-slate-900 font-bold text-2xl">{t('select_location')}</Text>
          </View>

          {/* Search Address — visual placeholder (behavior deferred) */}
          <View className="flex-row items-center border border-slate-200 rounded-2xl px-4 py-3.5">
            <Search size={20} color="#94a3b8" />
            <Text className="flex-1 ml-3 text-slate-400 text-base">{t('search_address_ph')}</Text>
          </View>
        </View>

        <View className="px-5 pt-4">
          {/* Use my Current Location */}
          <UseCurrentLocationRow
            permission={vm.permission}
            loading={vm.detecting}
            onPress={() => run(vm.detectCurrentLocation())}
          />

          {/* Set location on map */}
          <TouchableOpacity
            onPress={() => router.push('/location/map' as any)}
            activeOpacity={0.7}
            className="flex-row items-center gap-3 bg-white border border-slate-200 rounded-2xl px-4 py-3.5 mt-3"
          >
            <View className="w-9 h-9 rounded-full bg-rose-50 items-center justify-center">
              <MapPin size={18} color="#e11d48" />
            </View>
            <Text className="flex-1 text-slate-900 font-extrabold text-[14px]">
              {t('set_location_on_map')}
            </Text>
          </TouchableOpacity>

          {/* Saved addresses (auth only) */}
          {book.isAuthenticated && book.addresses.length > 0 ? (
            <View className="mt-6">
              <Text className="text-slate-500 font-semibold text-xs uppercase mb-3">
                {t('saved_addresses')}
              </Text>
              {book.addresses.map((a) => (
                <TouchableOpacity
                  key={a.id}
                  onPress={() => run(vm.selectAddress(a))}
                  className="flex-row items-center bg-white border border-slate-100 rounded-2xl px-4 py-4 mb-3"
                >
                  <View className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center">
                    <Text className="text-xl leading-none">{TAG_EMOJI[a.tag]}</Text>
                  </View>
                  <Text className="flex-1 ml-3 text-slate-900 text-base" numberOfLines={2}>
                    {[a.addressLine1, a.villageName].filter(Boolean).join(', ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}

          {/* Recent locations */}
          {vm.recentLocations.length > 0 ? (
            <View className="mt-6 pb-8">
              <Text className="text-slate-500 font-semibold text-xs uppercase mb-3">
                {t('recent_locations')}
              </Text>
              {vm.recentLocations.map((r) => (
                <TouchableOpacity
                  key={r.storeId}
                  onPress={() => run(vm.selectRecent(r).then(() => true))}
                  className="flex-row items-center bg-white border border-slate-100 rounded-2xl px-4 py-4 mb-3"
                >
                  <Clock size={20} color="#64748b" />
                  <Text className="flex-1 ml-3 text-slate-900 text-base" numberOfLines={1}>
                    {r.label}
                  </Text>
                  <MapPin size={16} color="#94a3b8" />
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
        </View>
      </ScrollView>

      <PermissionDeniedSheet
        visible={vm.blocked}
        onClose={vm.dismissBlocked}
        onGoToSettings={vm.openSettings}
      />
    </SafeAreaView>
  );
};
