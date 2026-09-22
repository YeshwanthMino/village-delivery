import { ChevronRight } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from '@/src/core/utils/useTranslation';

type Variant = 'default' | 'whatsapp' | 'danger';

interface ProfileRowProps {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  variant?: Variant;
  showChevron?: boolean;
}

export const ProfileRow = ({
  icon,
  label,
  onPress,
  variant = 'default',
  showChevron = true,
}: ProfileRowProps) => {
  const { locale } = useTranslation();
  const teFont = locale === 'te' ? { fontFamily: 'NotoSansTelugu_700Bold' } : undefined;

  const isWa = variant === 'whatsapp';
  const isDanger = variant === 'danger';

  const containerCls = isWa ? 'bg-green-50 border-green-200' : 'bg-white border-slate-100';
  const iconWrapCls = isDanger ? 'bg-red-50' : isWa ? 'bg-white' : 'bg-green-50';
  const labelCls = isDanger ? 'text-red-600' : isWa ? 'text-green-700' : 'text-slate-900';

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      className={`flex-row items-center gap-3 rounded-2xl px-4 py-4 mb-3 border ${containerCls}`}
    >
      <View className={`w-10 h-10 rounded-full items-center justify-center ${iconWrapCls}`}>
        {icon}
      </View>
      <Text className={`flex-1 font-semibold text-base ${labelCls}`} style={teFont}>
        {label}
      </Text>
      {showChevron && !isDanger ? <ChevronRight size={20} color="#cbd5e1" /> : null}
    </TouchableOpacity>
  );
};
