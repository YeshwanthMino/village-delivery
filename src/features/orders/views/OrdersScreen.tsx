import { ClipboardList } from 'lucide-react-native';
import React from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from '@/src/core/utils/useTranslation';

export const OrdersScreen = () => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['bottom', 'left', 'right']}>
      <View className="px-4 pb-2" style={{ paddingTop: insets.top + 16 }}>
        <Text className="text-slate-900 font-black text-2xl">{t('nav_orders')}</Text>
      </View>
      <View className="flex-1 items-center justify-center px-6">
        <View className="w-28 h-28 bg-green-50 rounded-full items-center justify-center mb-5">
          <ClipboardList size={52} color="#16a34a" />
        </View>
        <Text className="text-slate-900 font-bold text-xl mb-2">{t('orders_empty_title')}</Text>
        <Text className="text-slate-500 text-sm text-center">{t('orders_empty_subtitle')}</Text>
      </View>
    </SafeAreaView>
  );
};
