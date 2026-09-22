// src/features/location/views/components/VillageSearchField.tsx
//
// The village-directory search input. Shared by the standalone location screen
// and the map's search screen; the surrounding layout stays with each screen.

import React from 'react';
import { TextInput, TouchableOpacity, View } from 'react-native';
import { Search, X } from 'lucide-react-native';
import { useTranslation } from '@/src/core/utils/useTranslation';

interface Props {
  value: string;
  onChangeText: (next: string) => void;
  autoFocus?: boolean;
}

export const VillageSearchField = ({ value, onChangeText, autoFocus }: Props) => {
  const { t } = useTranslation();

  return (
    <View className="flex-row items-center border border-slate-200 rounded-2xl px-4 py-3.5">
      <Search size={20} color="#94a3b8" />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={t('village_search_ph')}
        placeholderTextColor="#94a3b8"
        className="flex-1 ml-3 text-slate-900 text-base"
        returnKeyType="search"
        autoCorrect={false}
        autoFocus={autoFocus}
      />
      {value.length > 0 ? (
        <TouchableOpacity onPress={() => onChangeText('')} hitSlop={8}>
          <X size={18} color="#94a3b8" />
        </TouchableOpacity>
      ) : null}
    </View>
  );
};
