import { Tag } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

interface CouponRowProps {
  applied: boolean;
  savings: number;  // pre-multiplier float (only shown when applied)
  onToggle: () => void;
}

export const CouponRow = ({ applied, savings, onToggle }: CouponRowProps) => (
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
        {applied ? 'Coupon VILLAGE10 applied' : 'Apply coupon'}
      </Text>
      <Text className="text-slate-500 text-xs mt-0.5">
        {applied
          ? `You saved ₹${Math.round(savings * 20)}`
          : 'Tap to apply VILLAGE10 — 10% off, up to ₹40'}
      </Text>
    </View>
    <Text className={`font-bold text-sm ${applied ? 'text-red-500' : 'text-green-600'}`}>
      {applied ? 'REMOVE' : 'APPLY'}
    </Text>
  </TouchableOpacity>
);
