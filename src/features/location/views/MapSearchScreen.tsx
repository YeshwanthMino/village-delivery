// src/features/location/views/MapSearchScreen.tsx
//
// Search-only location picker, reached from the search icon on the map picker.
// Deliberately narrower than SelectLocationScreen: no current-location row, no
// saved addresses, no recents — just the village search.
//
// Selecting a village does NOT commit it. It pops back to the map with the
// village's coordinates, and the map's own Confirm sheet stays the single place
// a location is written to the store.

import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useTranslation } from '@/src/core/utils/useTranslation';
import { useVillageSearch } from '../viewmodel/useVillageSearch';
import { withCoordinates, type LocatedVillage } from '../domain/villageSearch';
import { VillageSearchField } from './components/VillageSearchField';
import { VillageSearchResults } from './components/VillageSearchResults';

export const MapSearchScreen = () => {
  const { t } = useTranslation();
  const router = useRouter();

  // Only villages the map can point its camera at are offered here — a result
  // without coordinates would have nothing to recenter to.
  const search = useVillageSearch(withCoordinates);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/location/map');
  };

  // POP_TO the map already in the stack, carrying the pick as route params, so
  // the user returns to the same map rather than a fresh one. `at` makes every
  // pick distinct: without it, re-picking the village the user has since panned
  // away from would leave the params unchanged and the map would not move back.
  const onSelect = (village: LocatedVillage) => {
    router.dismissTo({
      pathname: '/location/map',
      params: {
        lat: String(village.latitude),
        lng: String(village.longitude),
        at: String(Date.now()),
      },
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top', 'left', 'right']}>
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {/* Header + search */}
        <View className="bg-white px-5 pt-2 pb-5">
          <View className="flex-row items-center gap-3 mb-5">
            <TouchableOpacity
              onPress={goBack}
              hitSlop={8}
              className="w-10 h-10 -ml-2 rounded-full items-center justify-center"
            >
              <ArrowLeft size={24} color="#0f172a" />
            </TouchableOpacity>
            <Text className="text-slate-900 font-bold text-2xl">{t('search_location')}</Text>
          </View>

          <VillageSearchField value={search.query} onChangeText={search.setQuery} autoFocus />
        </View>

        <View className="px-5 pt-4 pb-8">
          {/* `withCoordinates` narrows the results, so every row is a LocatedVillage. */}
          <VillageSearchResults search={search} onSelect={onSelect} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
