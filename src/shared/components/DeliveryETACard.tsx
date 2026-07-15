import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight, Clock } from 'lucide-react-native';
import React from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from '@/src/core/utils/useTranslation';

export const DeliveryETACard = () => {
  const { t } = useTranslation();
  return (
    <LinearGradient
      colors={['#16a34a', '#059669']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={{ borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center' }}
    >
      <View style={{ width: 40, height: 40, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
        <Clock size={20} color="white" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: 'white', fontWeight: '700', fontSize: 14 }}>{`${t('delivery_in')} 1 hour`}</Text>
      </View>
      <ChevronRight size={18} color="rgba(255,255,255,0.7)" />
    </LinearGradient>
  );
};
