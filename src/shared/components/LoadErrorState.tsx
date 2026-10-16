import { RefreshCw } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Line, Path, Rect } from 'react-native-svg';
import { useTranslation } from '@/src/core/utils/useTranslation';

interface Props {
  onRetry: () => void;
  title?: string;
  description?: string;
  /** Layout classes for the wrapper; override when nested in a ScrollView. */
  className?: string;
}

/** Vector illustration: an empty grocery basket with a dropped apple and a
 *  warning badge. Pure SVG, so it stays crisp at any density. */
const BasketIllustration = () => (
  <Svg width={200} height={170} viewBox="0 0 200 170">
    <Circle cx={100} cy={88} r={74} fill="#f0fdf4" />
    <Circle cx={34} cy={36} r={5} fill="#bbf7d0" />
    <Circle cx={170} cy={52} r={7} fill="#dcfce7" />
    <Circle cx={160} cy={132} r={4} fill="#bbf7d0" />
    <Ellipse cx={100} cy={150} rx={58} ry={7} fill="#16a34a" fillOpacity={0.12} />

    {/* handle */}
    <Path d="M62 78 C62 34 138 34 138 78" fill="none" stroke="#15803d" strokeWidth={6} strokeLinecap="round" />
    {/* basket body */}
    <Path d="M42 78 H158 L146 138 Q145 144 139 144 H61 Q55 144 54 138 Z" fill="#22c55e" />
    <Rect x={38} y={72} width={124} height={12} rx={6} fill="#16a34a" />
    <G stroke="#15803d" strokeWidth={3} strokeLinecap="round" strokeOpacity={0.55}>
      <Line x1={76} y1={90} x2={79} y2={136} />
      <Line x1={100} y1={90} x2={100} y2={136} />
      <Line x1={124} y1={90} x2={121} y2={136} />
      <Line x1={50} y1={108} x2={150} y2={108} />
    </G>

    {/* apple that fell out */}
    <G transform="rotate(-14 160 140)">
      <Circle cx={156} cy={138} r={13} fill="#ef4444" />
      <Path d="M156 126 Q160 118 167 119 Q165 126 156 126 Z" fill="#16a34a" />
    </G>

    {/* warning badge */}
    <Circle cx={142} cy={44} r={17} fill="#f59e0b" />
    <Rect x={140} y={34} width={4} height={13} rx={2} fill="#ffffff" />
    <Circle cx={142} cy={52} r={2.4} fill="#ffffff" />
  </Svg>
);

export const LoadErrorState = ({ onRetry, title, description, className = 'flex-1 items-center justify-center px-8' }: Props) => {
  const { t } = useTranslation();
  return (
    <View className={className}>
      <BasketIllustration />
      <Text className="text-slate-900 font-bold text-xl mt-4 mb-2 text-center">{title ?? t('load_failed_title')}</Text>
      <Text className="text-slate-500 text-sm text-center mb-6">{description ?? t('load_failed_desc')}</Text>
      <TouchableOpacity
        onPress={onRetry}
        activeOpacity={0.85}
        className="bg-green-600 rounded-2xl px-8 py-3 flex-row items-center"
      >
        <RefreshCw size={16} color="#ffffff" />
        <Text className="text-white font-bold text-sm ml-2">{t('retry')}</Text>
      </TouchableOpacity>
    </View>
  );
};
