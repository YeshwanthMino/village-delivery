// src/features/cart/views/components/DeliveryAddressCard.tsx
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { MapPin, Plus } from 'lucide-react-native';
import { useTranslation } from '@/src/core/utils/useTranslation';
import type { Address } from '@/src/features/location/domain/models';

interface Props {
  address: Address | null;
  loading?: boolean;
  onPress: () => void;
}

export const DeliveryAddressCard = ({ address, loading, onPress }: Props) => {
  const { t } = useTranslation();

  if (!address) {
    if (loading) {
      return (
        <View className="bg-white border border-slate-200 rounded-2xl p-4 flex-row items-center gap-3">
          <View className="w-9 h-9 rounded-full bg-slate-100" />
          <View className="flex-1 gap-2">
            <View className="h-3.5 w-24 bg-slate-100 rounded" />
            <View className="h-3 w-40 bg-slate-50 rounded" />
          </View>
        </View>
      );
    }
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.85}
        accessibilityRole="button"
        className="bg-white border border-dashed border-green-300 rounded-2xl p-4 flex-row items-center gap-3"
      >
        <View className="w-9 h-9 rounded-full bg-green-50 items-center justify-center">
          <Plus size={18} color="#16a34a" />
        </View>
        <Text className="flex-1 text-green-700 font-bold text-sm">{t('add_delivery_address')}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View className="bg-white border border-slate-200 rounded-2xl p-4 flex-row items-start gap-3">
      <View className="mt-0.5">
        <MapPin size={18} color="#16a34a" />
      </View>
      <View className="flex-1">
        <Text className="text-slate-900 font-bold text-sm">{t(`address_tag_${address.tag}`)}</Text>
        <Text className="text-slate-500 text-xs mt-0.5" numberOfLines={2}>
          {[address.addressLine1, address.villageName].filter(Boolean).join(', ')}
        </Text>
      </View>
      <TouchableOpacity
        onPress={onPress}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        accessibilityRole="button"
      >
        <Text className="text-green-600 font-bold text-sm">{t('change')}</Text>
      </TouchableOpacity>
    </View>
  );
};
