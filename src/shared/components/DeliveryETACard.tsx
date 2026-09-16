import { Package, Zap } from 'lucide-react-native';
import React from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from '@/src/core/utils/useTranslation';

export const DeliveryETACard = () => {
  const { t } = useTranslation();
  return (
    <View
      style={{
        borderRadius: 16,
        padding: 14,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#f1f5f9',
      }}
    >
      <View style={{ width: 40, height: 40, backgroundColor: '#f8fafc', borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
        <Package size={20} color="#64748b" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: '#94a3b8', fontWeight: '500', fontSize: 13 }}>{t('arriving_from')}</Text>
        <Text style={{ color: '#0f172a', fontWeight: '700', fontSize: 16, marginTop: 1 }}>{t('nearest_store')}</Text>
      </View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          backgroundColor: '#f0fdf4',
          borderRadius: 999,
          paddingVertical: 6,
          paddingHorizontal: 12,
        }}
      >
        <Zap size={14} color="#16a34a" fill="#16a34a" />
        <Text style={{ color: '#16a34a', fontWeight: '700', fontSize: 13 }}>{t('delivery_eta_minutes')}</Text>
      </View>
    </View>
  );
};
