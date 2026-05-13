import { Check, X } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { SortKey } from '@/src/base/types/village.types';
import { useVillageStore } from '@/src/core/store';
import { VillageBottomSheet } from './VillageBottomSheet';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'popular',    label: 'Most Popular' },
  { key: 'price_asc',  label: 'Price: Low to High' },
  { key: 'price_desc', label: 'Price: High to Low' },
  { key: 'rating',     label: 'Top Rated' },
];

interface SortBottomSheetProps {
  visible: boolean;
  onClose: () => void;
}

export const SortBottomSheet = ({ visible, onClose }: SortBottomSheetProps) => {
  const sortKey = useVillageStore(state => state.sortKey);
  const setSortKey = useVillageStore(state => state.setSortKey);

  const handleSelect = (key: SortKey) => {
    setSortKey(key);
    onClose();
  };

  return (
    <VillageBottomSheet visible={visible} onClose={onClose}>
      <View className="pb-6">
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 pb-3 border-b border-slate-100">
          <Text className="text-slate-900 font-bold text-base">Sort by</Text>
          <TouchableOpacity onPress={onClose} className="w-8 h-8 items-center justify-center">
            <X size={20} color="#64748b" />
          </TouchableOpacity>
        </View>

        {/* Options */}
        <View className="px-4 mt-3 gap-2">
          {SORT_OPTIONS.map(option => {
            const isActive = sortKey === option.key;
            return (
              <TouchableOpacity
                key={option.key}
                onPress={() => handleSelect(option.key)}
                className={`flex-row items-center justify-between h-12 px-4 rounded-xl border-2 ${
                  isActive
                    ? 'bg-green-600 border-green-600'
                    : 'bg-white border-slate-200'
                }`}
              >
                <Text className={`font-semibold text-sm ${isActive ? 'text-white' : 'text-slate-700'}`}>
                  {option.label}
                </Text>
                {isActive && <Check size={18} color="white" />}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </VillageBottomSheet>
  );
};
