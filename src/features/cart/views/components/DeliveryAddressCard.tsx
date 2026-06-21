// src/features/cart/views/components/DeliveryAddressCard.tsx
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { MapPin, Plus } from 'lucide-react-native';
import { useTranslation } from '@/src/core/utils/useTranslation';
import type { Address } from '@/src/features/location/domain/models';

interface Props {
  address: Address | null;
  onPress: () => void;
}

export const DeliveryAddressCard = ({ address, onPress }: Props) => {
  const { t } = useTranslation();

  if (!address) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.85}
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
      <MapPin size={18} color="#16a34a" className="mt-0.5" />
      <View className="flex-1">
        <Text className="text-slate-900 font-bold text-sm">{t(`address_tag_${address.tag}`)}</Text>
        <Text className="text-slate-500 text-xs mt-0.5" numberOfLines={2}>
          {[address.addressLine1, address.villageName].filter(Boolean).join(', ')}
        </Text>
      </View>
      <TouchableOpacity onPress={onPress}>
        <Text className="text-green-600 font-bold text-sm">{t('change')}</Text>
      </TouchableOpacity>
    </View>
  );
};
