import { Check, X } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { SortKey } from '@/src/base/types/village.types';
import { useTranslation } from '@/src/core/utils/useTranslation';
import { VillageBottomSheet } from './VillageBottomSheet';

const SORT_KEYS: SortKey[] = ['popular', 'price_asc', 'price_desc', 'rating'];

interface SortBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  sortKey: SortKey;
  onSortChange: (key: SortKey) => void;
}

const SORT_TRANSLATION_KEYS: Record<SortKey, string> = {
  popular:    'sort_popular',
  price_asc:  'sort_price_asc',
  price_desc: 'sort_price_desc',
  rating:     'sort_rating',
};

export const SortBottomSheet = ({ visible, onClose, sortKey, onSortChange }: SortBottomSheetProps) => {
  const { t } = useTranslation();
  const handleSelect = (key: SortKey) => {
    onSortChange(key);
    onClose();
  };

  return (
    <VillageBottomSheet visible={visible} onClose={onClose}>
      <View className="pb-6">
        <View className="flex-row items-center justify-between px-4 pb-3 border-b border-slate-100">
          <Text className="text-slate-900 font-bold text-base">{t('sort_by')}</Text>
          <TouchableOpacity onPress={onClose} className="w-8 h-8 items-center justify-center">
            <X size={20} color="#64748b" />
          </TouchableOpacity>
        </View>
        <View className="px-4 mt-3 gap-2">
          {SORT_KEYS.map(key => {
            const isActive = sortKey === key;
            return (
              <TouchableOpacity
                key={key}
                onPress={() => handleSelect(key)}
                className={`flex-row items-center justify-between h-12 px-4 rounded-xl border-2 ${
                  isActive
                    ? 'bg-green-600 border-green-600'
                    : 'bg-white border-slate-200'
                }`}
              >
                <Text className={`font-semibold text-sm ${isActive ? 'text-white' : 'text-slate-700'}`}>
                  {t(SORT_TRANSLATION_KEYS[key])}
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
