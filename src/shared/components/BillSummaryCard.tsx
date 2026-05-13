import { Receipt } from 'lucide-react-native';
import React from 'react';
import { Text, View } from 'react-native';
import { Bill } from '@/src/base/types/village.types';
import { rupees } from '@/src/features/home/data/static/villageData';

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
  couponApplied: boolean;
}

export const BillSummaryCard = ({ bill, couponApplied }: BillSummaryCardProps) => (
  <View className="bg-white border border-slate-200 rounded-2xl p-4">
    {/* Header */}
    <View className="flex-row items-center gap-2 mb-3">
      <Receipt size={16} color="#64748b" />
      <Text className="text-slate-500 text-xs font-bold tracking-wider">BILL SUMMARY</Text>
    </View>

    <BillRow label="Item total (MRP)" value={rupees(bill.mrpTotal)} />
    <BillRow label="Discount on MRP" value={`-${rupees(bill.itemDiscount)}`} isGreen />
    <BillRow
      label="Delivery fee"
      value={bill.deliveryFee === 0 ? 'FREE' : rupees(bill.deliveryFee)}
      isGreen={bill.deliveryFee === 0}
    />
    <BillRow label="Platform fee" value={rupees(bill.platformFee)} />
    {couponApplied && bill.couponDiscount > 0 && (
      <BillRow label="Coupon (VILLAGE10)" value={`-${rupees(bill.couponDiscount)}`} isGreen />
    )}

    {/* Dashed divider */}
    <View className="border-t border-dashed border-slate-300 my-2" />

    <BillRow label="To Pay" value={rupees(bill.grandTotal)} isBold />

    {/* Savings callout */}
    {bill.totalSavings > 0 && (
      <View className="bg-green-50 rounded-xl px-3 py-2 mt-2">
        <Text className="text-green-700 text-xs font-medium text-center">
          🎉 You saved {rupees(bill.totalSavings)} on this order
        </Text>
      </View>
    )}
  </View>
);
