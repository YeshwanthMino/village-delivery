import { Banknote, Smartphone } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from '@/src/core/utils/useTranslation';

export type PaymentMethod = 'cod' | 'upi' | null;

interface PaymentMethodSectionProps {
  selected: PaymentMethod;
  onSelect: (method: 'cod' | 'upi') => void;
}

const OPTIONS = [
  { method: 'cod', Icon: Banknote, titleKey: 'cod', subtitleKey: 'cod_subtitle' },
  { method: 'upi', Icon: Smartphone, titleKey: 'upi', subtitleKey: 'upi_subtitle' },
] as const;

export const PaymentMethodSection = ({ selected, onSelect }: PaymentMethodSectionProps) => {
  const { t } = useTranslation();

  return (
    <View>
      <Text className="text-slate-500 text-[10px] font-bold tracking-widest mb-1 uppercase">
        {t('payment_title')}
      </Text>
      <Text className="text-slate-400 text-xs mb-2.5">{t('choose_payment_method')}</Text>

      <View className="gap-2.5">
        {OPTIONS.map(({ method, Icon, titleKey, subtitleKey }) => {
          const isSelected = selected === method;
          return (
            <TouchableOpacity
              key={method}
              activeOpacity={0.85}
              onPress={() => onSelect(method)}
              className={`flex-row items-center justify-between bg-white rounded-2xl px-3.5 py-3.5 ${
                isSelected ? 'border-2 border-green-600' : 'border border-slate-100'
              }`}
            >
              <View className="flex-row items-center gap-3">
                <View className="w-10 h-10 rounded-xl bg-slate-100 items-center justify-center">
                  <Icon size={21} color="#475569" />
                </View>
                <View>
                  <Text className="text-slate-900 font-bold text-[15px]">{t(titleKey)}</Text>
                  <Text className="text-slate-400 text-xs mt-0.5">{t(subtitleKey)}</Text>
                </View>
              </View>

              <View
                className={`w-[22px] h-[22px] rounded-full items-center justify-center ${
                  isSelected ? 'bg-green-600' : 'border-2 border-slate-300'
                }`}
              >
                {isSelected && <View className="w-[9px] h-[9px] rounded-full bg-white" />}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};
