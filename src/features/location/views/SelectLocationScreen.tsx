// src/features/location/views/SelectLocationScreen.tsx
//
// Full-screen location picker reached from the "Search your Location" button.
// Village search (debounced) + Use my Current Location + saved addresses
// + recent locations.

import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Clock, MapPin, Search, X } from 'lucide-react-native';
import { useTranslation } from '@/src/core/utils/useTranslation';
import { interpolate } from '@/src/base/constants/translations';
import { AddressTag } from '../domain/models';
import { useLocationViewModel } from '../viewmodel/useLocationViewModel';
import { useAddressBookViewModel } from '../viewmodel/useAddressBookViewModel';
import { useVillageSearchQuery } from '../data/queries/useVillageSearchQuery';
import { UseCurrentLocationRow } from './components/UseCurrentLocationRow';
import { PermissionDeniedSheet } from './components/PermissionDeniedSheet';

const TAG_EMOJI: Record<AddressTag, string> = { home: '🏠', work: '🏢', other: '📍' };

export const SelectLocationScreen = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const vm = useLocationViewModel();
  const book = useAddressBookViewModel();

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // 500ms debounce: village search fires only after typing settles.
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query), 500);
    return () => clearTimeout(id);
  }, [query]);

  const villageSearch = useVillageSearchQuery(debouncedQuery);
  const showResults = query.trim().length >= 3;
  const villageResults = villageSearch.data ?? [];
  // Debounce hasn't caught up to the live query yet — treat as "searching" so
  // the empty state doesn't flash before the request fires.
  const searchPending = query.trim() !== debouncedQuery.trim();

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

          {/* Village search */}
          <View className="flex-row items-center border border-slate-200 rounded-2xl px-4 py-3.5">
            <Search size={20} color="#94a3b8" />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={t('village_search_ph')}
              placeholderTextColor="#94a3b8"
              className="flex-1 ml-3 text-slate-900 text-base"
              returnKeyType="search"
              autoCorrect={false}
            />
            {query.length > 0 ? (
              <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
                <X size={18} color="#94a3b8" />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        <View className="px-5 pt-4">
          {/* Search results (village directory) */}
          {showResults ? (
            <View className="mb-2">
              <View className="flex-row items-center mb-3">
                <Text className="text-slate-500 font-semibold text-xs uppercase">
                  {t('search_results')}
                </Text>
                {villageSearch.isFetching || searchPending ? (
                  <ActivityIndicator size="small" color="#64748b" className="ml-2" />
                ) : null}
              </View>

              {villageSearch.isError ? (
                <Text className="text-slate-400 text-sm mb-2">{t('village_search_error')}</Text>
              ) : villageResults.length === 0 && !villageSearch.isFetching && !searchPending ? (
                <Text className="text-slate-400 text-sm mb-2">
                  {interpolate(t('no_villages_found'), query.trim())}
                </Text>
              ) : (
                villageResults.map((v) => (
                  <TouchableOpacity
                    key={v.id}
                    onPress={() => run(vm.selectVillage(v))}
                    className="flex-row items-center bg-white border border-slate-100 rounded-2xl px-4 py-4 mb-3"
                  >
                    <View className="w-9 h-9 rounded-full bg-rose-50 items-center justify-center">
                      <MapPin size={18} color="#e11d48" />
                    </View>
                    <View className="flex-1 ml-3">
                      <Text className="text-slate-900 font-semibold text-base" numberOfLines={1}>
                        {v.name}
                      </Text>
                      {v.secondaryName || v.pincode ? (
                        <Text className="text-slate-400 text-xs" numberOfLines={1}>
                          {[v.secondaryName, v.pincode].filter(Boolean).join(' · ')}
                        </Text>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>
          ) : null}

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
