// src/features/location/views/components/VillageSearchResults.tsx
//
// Village-directory search results: the section heading with its inline
// spinner, the error / empty states, and the tappable rows. Renders nothing
// until the query is long enough to search. Shared by the standalone location
// screen and the map's search screen.

import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { MapPin } from 'lucide-react-native';
import { useTranslation } from '@/src/core/utils/useTranslation';
import { interpolate } from '@/src/base/constants/translations';
import type { Village } from '../../domain/models';
import type { VillageSearch } from '../../viewmodel/useVillageSearch';

interface Props<T extends Village> {
  search: VillageSearch<T>;
  onSelect: (village: T) => void;
}

export const VillageSearchResults = <T extends Village>({ search, onSelect }: Props<T>) => {
  const { t } = useTranslation();
  const { query, results, isFetching, isError, showResults, searchPending } = search;

  if (!showResults) return null;

  const busy = isFetching || searchPending;

  return (
    <View className="mb-2">
      <View className="flex-row items-center mb-3">
        <Text className="text-slate-500 font-semibold text-xs uppercase">{t('search_results')}</Text>
        {busy ? <ActivityIndicator size="small" color="#64748b" className="ml-2" /> : null}
      </View>

      {isError ? (
        <Text className="text-slate-400 text-sm mb-2">{t('village_search_error')}</Text>
      ) : results.length === 0 && !busy ? (
        <Text className="text-slate-400 text-sm mb-2">
          {interpolate(t('no_villages_found'), query.trim())}
        </Text>
      ) : (
        results.map((v) => (
          <TouchableOpacity
            key={v.id}
            onPress={() => onSelect(v)}
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
  );
};
