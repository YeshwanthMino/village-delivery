import { Tag } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from '@/src/core/utils/useTranslation';
import { interpolate } from '@/src/base/constants/translations';

interface CouponRowProps {
  applied: boolean;
  savings: number;
  onToggle: () => void;
}

export const CouponRow = ({ applied, savings, onToggle }: CouponRowProps) => {
  const { t } = useTranslation();

  return (
    <TouchableOpacity
      onPress={onToggle}
      className={`flex-row items-center rounded-2xl border-2 p-3 gap-3 ${
        applied ? 'bg-green-50 border-green-200' : 'bg-white border-slate-200'
      }`}
    >
      <View className={`w-10 h-10 rounded-xl items-center justify-center ${
        applied ? 'bg-green-600' : 'bg-green-50'
      }`}>
        <Tag size={20} color={applied ? 'white' : '#16a34a'} />
      </View>
      <View className="flex-1">
        <Text className="text-slate-900 font-bold text-sm">
          {applied ? t('coupon_applied') : t('apply_coupon')}
        </Text>
        <Text className="text-slate-500 text-xs mt-0.5">
          {applied
            ? interpolate(t('coupon_savings'), Math.round(savings * 20))
            : t('coupon_hint')}
        </Text>
      </View>
      <Text className={`font-bold text-sm ${applied ? 'text-red-500' : 'text-green-600'}`}>
        {applied ? t('remove') : t('apply')}
      </Text>
    </TouchableOpacity>
  );
};
