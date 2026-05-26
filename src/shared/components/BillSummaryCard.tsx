import { Receipt } from 'lucide-react-native';
import React from 'react';
import { Text, View } from 'react-native';
import { Bill } from '@/src/base/types/village.types';
import { rupees } from '@/src/features/home/data/static/villageData';
import { useTranslation } from '@/src/core/utils/useTranslation';
import { interpolate } from '@/src/base/constants/translations';

interface BillRowProps {
  label: string;
  value: string;
  isGreen?: boolean;
  isBold?: boolean;
}

const BillRow = ({ label, value, isGreen, isBold }: BillRowProps) => (
  <View className="flex-row justify-between items-center py-1.5">
    <Text className={`text-sm ${isBold ? 'text-slate-900 font-bold' : 'text-slate-600'}`}>{label}</Text>
    <Text className={`text-sm ${isBold ? 'text-slate-900 font-bold' : ''} ${isGreen ? 'text-green-600 font-medium' : 'text-slate-900'}`}>
      {value}
    </Text>
  </View>
);

interface BillSummaryCardProps {
  bill: Bill;
}

export const BillSummaryCard = ({ bill }: BillSummaryCardProps) => {
  const { t } = useTranslation();

  return (
    <View className="bg-white border border-slate-200 rounded-2xl p-4">
      <View className="flex-row items-center gap-2 mb-3">
        <Receipt size={16} color="#64748b" />
        <Text className="text-slate-500 text-xs font-bold tracking-wider">{t('bill_summary')}</Text>
      </View>

      <BillRow label={t('item_total_mrp')} value={rupees(bill.mrpTotal)} />
      <BillRow label={t('discount_on_mrp')} value={`-${rupees(bill.itemDiscount)}`} isGreen />
      <BillRow
        label={t('delivery_fee')}
        value={bill.deliveryFee === 0 ? t('free') : rupees(bill.deliveryFee)}
        isGreen={bill.deliveryFee === 0}
      />
      <BillRow label={t('platform_fee')} value={rupees(bill.platformFee)} />
      <View className="border-t border-dashed border-slate-300 my-2" />

      <BillRow label={t('to_pay')} value={rupees(bill.grandTotal)} isBold />

      {bill.totalSavings > 0 && (
        <View className="bg-green-50 rounded-xl px-3 py-2 mt-2">
          <Text className="text-green-700 text-xs font-medium text-center">
            {interpolate(t('you_saved_order'), rupees(bill.totalSavings))}
          </Text>
        </View>
      )}
    </View>
  );
};
