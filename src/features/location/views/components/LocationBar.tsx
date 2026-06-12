// src/features/location/views/components/LocationBar.tsx
//
// Home toolbar delivery-location control (Zepto / Blinkit style):
// location name + "Delivery in …" with a detecting state.

import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { ChevronDown, MapPin } from 'lucide-react-native';
import { useTranslation } from '@/src/core/utils/useTranslation';
import { Village } from '../../domain/models';

interface Props {
  village: Village | null;
  detecting: boolean;
  deliveryEta?: string;
  onPress: () => void;
}

export const LocationBar = ({ village, detecting, deliveryEta = '1 Hour', onPress }: Props) => {
  const { t } = useTranslation();

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} className="flex-1 mr-3">
      {detecting && !village ? (
        <View>
          <Text className="text-slate-400 font-bold text-[10.5px] uppercase tracking-[0.12em]">
            {t('detecting_location')}
          </Text>
          <View className="flex-row items-center gap-1.5 mt-0.5">
            <ActivityIndicator size="small" color="#16a34a" />
            <Text className="text-slate-400 font-black text-base">{t('finding_address')}</Text>
          </View>
        </View>
      ) : (
        <View>
          <View className="flex-row items-center gap-1">
            <MapPin size={14} color="#16a34a" />
            <Text className="text-slate-900 font-black text-base" numberOfLines={1} style={{ maxWidth: 200 }}>
              {village?.name ?? t('select_delivery_location')}
            </Text>
            <ChevronDown size={15} color="#64748b" />
          </View>
          {village ? (
            <Text className="text-slate-500 font-bold text-[10.5px] uppercase tracking-[0.12em] mt-0.5 pl-[18px]">
              {t('delivery_in')} {deliveryEta}
            </Text>
          ) : null}
        </View>
      )}
    </TouchableOpacity>
  );
};
