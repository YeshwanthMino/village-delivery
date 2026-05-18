import React, { useEffect, useRef, useState } from 'react';
import { Animated, FlatList, Pressable, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Order, OrderStatus } from '@/src/base/types/village.types';
import { rupees } from '@/src/features/home/data/static/villageData';
import { useTranslation } from '@/src/core/utils/useTranslation';
import { interpolate } from '@/src/base/constants/translations';
import { useOrdersViewModel } from '../viewmodel/useOrdersViewModel';

// ── Status badge ─────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<OrderStatus, { bg: string; text: string }> = {
  placed:           { bg: 'bg-amber-100',  text: 'text-amber-700'  },
  confirmed:        { bg: 'bg-blue-100',   text: 'text-blue-700'   },
  out_for_delivery: { bg: 'bg-orange-100', text: 'text-orange-700' },
  delivered:        { bg: 'bg-green-100',  text: 'text-green-700'  },
  cancelled:        { bg: 'bg-slate-100',  text: 'text-slate-500'  },
};

function StatusBadge({ status }: { status: OrderStatus }) {
  const { t } = useTranslation();
  const styles = STATUS_STYLES[status];
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (status !== 'out_for_delivery') return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,   duration: 600, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [status]);

  const labelKey: Record<OrderStatus, string> = {
    placed:           'status_placed',
    confirmed:        'status_confirmed',
    out_for_delivery: 'status_out_for_delivery',
    delivered:        'status_delivered',
    cancelled:        'status_cancelled',
  };

  return (
    <View className={`flex-row items-center gap-1 px-2 py-0.5 rounded-full ${styles.bg}`}>
      {status === 'out_for_delivery' && (
        <Animated.View
          style={{ opacity: pulseAnim }}
          className="w-1.5 h-1.5 rounded-full bg-orange-500"
        />
      )}
      <Text className={`text-xs font-semibold ${styles.text}`}>{t(labelKey[status])}</Text>
    </View>
  );
}

// ── Order card ────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function OrderCard({ order, onPress }: { order: Order; onPress: () => void }) {
  const { t, locale } = useTranslation();
  const teFont = locale === 'te' ? { fontFamily: 'NotoSansTelugu_700Bold' } : undefined;

  const visibleItems = order.items.slice(0, 3);
  const extraCount  = order.items.length - 3;

  return (
    <Pressable
      onPress={onPress}
      className="bg-white border border-slate-100 rounded-2xl p-4 mb-3 mx-4"
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
    >
      {/* Top row */}
      <View className="flex-row justify-between items-center mb-1">
        <Text className="text-slate-900 font-bold text-sm" style={teFont}>
          {interpolate(t('order_id'), order.id)}
        </Text>
        <StatusBadge status={order.status} />
      </View>

      {/* Date + payment */}
      <Text className="text-slate-400 text-xs mb-3">
        {formatDate(order.placedAt)} · {order.paymentMethod.toUpperCase()}
      </Text>

      {/* Emoji row + total */}
      <View className="flex-row justify-between items-center">
        <View className="flex-row items-center gap-1">
          {visibleItems.map((item, i) => (
            <Text key={i} className="text-2xl">{item.emoji}</Text>
          ))}
          {extraCount > 0 && (
            <Text className="text-slate-500 text-xs font-medium ml-1">+{extraCount} more</Text>
          )}
        </View>
        <Text className="text-slate-900 font-bold text-base">{rupees(order.bill.grandTotal)}</Text>
      </View>

      {/* View details */}
      <View className="border-t border-slate-100 mt-3 pt-2">
        <Text className="text-green-600 text-xs font-semibold text-right" style={teFont}>
          {t('view_details')}
        </Text>
      </View>
    </Pressable>
  );
}

// ── Section header ────────────────────────────────────────────────────────────

function SectionHeader({ label }: { label: string }) {
  return (
    <Text className="text-slate-500 text-xs font-bold tracking-wider uppercase px-4 mb-2 mt-4">
      {label}
    </Text>
  );
}

// ── Filter chips ──────────────────────────────────────────────────────────────

type FilterValue = 'all' | OrderStatus;

const FILTER_CHIPS: { value: FilterValue; labelKey: string }[] = [
  { value: 'all',             labelKey: 'orders_filter_all'        },
  { value: 'out_for_delivery',labelKey: 'status_out_for_delivery'  },
  { value: 'confirmed',       labelKey: 'status_confirmed'         },
  { value: 'placed',          labelKey: 'status_placed'            },
  { value: 'delivered',       labelKey: 'status_delivered'         },
  { value: 'cancelled',       labelKey: 'status_cancelled'         },
];

function FilterChips({
  selected,
  onChange,
}: {
  selected: FilterValue;
  onChange: (v: FilterValue) => void;
}) {
  const { t } = useTranslation();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ flexGrow: 0, height: 48 }}
      contentContainerStyle={{ paddingHorizontal: 16, alignItems: 'center', height: 48 }}
    >
      {FILTER_CHIPS.map((chip, index) => {
        const active = selected === chip.value;
        return (
          <Pressable
            key={chip.value}
            onPress={() => onChange(chip.value)}
            style={{ marginRight: index < FILTER_CHIPS.length - 1 ? 8 : 0, flexShrink: 0 }}
            className={`px-3 py-1.5 rounded-full border ${
              active
                ? 'bg-green-600 border-green-600'
                : 'bg-white border-slate-200'
            }`}
          >
            <Text
              numberOfLines={1}
              className={`text-xs font-semibold ${
                active ? 'text-white' : 'text-slate-600'
              }`}
            >
              {t(chip.labelKey)}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

// ── Empty state illustration ──────────────────────────────────────────────────

function OrderIllustration() {
  return (
    <Svg width={220} height={180} viewBox="0 0 220 180">
      {/* Ground shadow */}
      <Ellipse cx={110} cy={168} rx={72} ry={9} fill="#e2e8f0" />

      {/* Scooter body */}
      <Ellipse cx={75} cy={152} rx={14} ry={14} fill="#cbd5e1" />
      <Ellipse cx={75} cy={152} rx={8}  ry={8}  fill="#94a3b8" />
      <Ellipse cx={155} cy={152} rx={14} ry={14} fill="#cbd5e1" />
      <Ellipse cx={155} cy={152} rx={8}  ry={8}  fill="#94a3b8" />

      {/* Scooter frame */}
      <Path d="M88 148 L100 120 L140 120 L152 148" stroke="#64748b" strokeWidth={4} strokeLinecap="round" fill="none" />
      <Path d="M100 120 L88 120 L80 148" stroke="#64748b" strokeWidth={3.5} strokeLinecap="round" fill="none" />
      <Path d="M140 120 L148 130 L155 148" stroke="#64748b" strokeWidth={3.5} strokeLinecap="round" fill="none" />
      {/* Handlebar */}
      <Path d="M144 120 L155 112 L165 114" stroke="#64748b" strokeWidth={3} strokeLinecap="round" fill="none" />
      {/* Seat */}
      <Rect x={105} y={116} width={32} height={7} rx={3.5} fill="#475569" />

      {/* Delivery box on scooter */}
      {/* Box body */}
      <Rect x={96} y={72} width={48} height={46} rx={5} fill="#fef9c3" />
      <Rect x={96} y={72} width={48} height={46} rx={5} stroke="#fbbf24" strokeWidth={1.5} fill="none" />
      {/* Box flap left */}
      <Path d="M96 72 L96 56 L120 62 L120 72" fill="#fef08a" stroke="#fbbf24" strokeWidth={1.5} />
      {/* Box flap right */}
      <Path d="M144 72 L144 56 L120 62 L120 72" fill="#fde047" stroke="#fbbf24" strokeWidth={1.5} />
      {/* Green tape stripe */}
      <Rect x={115} y={72} width={10} height={46} fill="#bbf7d0" opacity={0.7} />
      {/* Check badge */}
      <Circle cx={120} cy={97} r={12} fill="#dcfce7" />
      <Path d="M114 97 L118 102 L127 92" stroke="#16a34a" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />

      {/* Floating grocery items */}
      {/* Tomato */}
      <Circle cx={58} cy={80} r={10} fill="#fca5a5" />
      <Path d="M58 70 Q60 64 64 66" stroke="#4ade80" strokeWidth={2} strokeLinecap="round" fill="none" />
      {/* Leaf */}
      <Path d="M58 70 Q55 64 59 62" stroke="#4ade80" strokeWidth={1.5} strokeLinecap="round" fill="none" />

      {/* Carrot */}
      <Path d="M168 68 L175 90" stroke="#fb923c" strokeWidth={7} strokeLinecap="round" />
      <Path d="M168 68 Q165 62 169 60" stroke="#4ade80" strokeWidth={2} strokeLinecap="round" fill="none" />
      <Path d="M168 68 Q163 65 164 61" stroke="#4ade80" strokeWidth={1.5} strokeLinecap="round" fill="none" />

      {/* Sparkles */}
      <G>
        <Path d="M48 48 L50 42 L52 48 L58 50 L52 52 L50 58 L48 52 L42 50 Z" fill="#fbbf24" opacity={0.8} />
        <Path d="M172 40 L173.5 36 L175 40 L179 41.5 L175 43 L173.5 47 L172 43 L168 41.5 Z" fill="#34d399" opacity={0.8} />
        <Circle cx={40} cy={110} r={3} fill="#fbbf24" opacity={0.6} />
        <Circle cx={182} cy={105} r={2.5} fill="#86efac" opacity={0.7} />
        <Circle cx={60} cy={130} r={2} fill="#fbbf24" opacity={0.5} />
      </G>
    </Svg>
  );
}

function EmptyOrders() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <View className="flex-1 items-center justify-center px-8">
      <OrderIllustration />

      <Text className="text-slate-900 font-black text-2xl mt-4 mb-2 text-center">
        {t('orders_empty_title')}
      </Text>
      <Text className="text-slate-500 text-sm text-center mb-8 leading-5">
        {t('orders_empty_subtitle')}
      </Text>

      <TouchableOpacity
        onPress={() => router.push('/(dashboard)/home' as any)}
        className="bg-green-600 rounded-2xl px-8 py-3"
        activeOpacity={0.85}
      >
        <Text className="text-white font-bold text-sm">{t('shop_now')}</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export const OrdersScreen = () => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { allOrders, activeOrders, pastOrders } = useOrdersViewModel();
  const [filter, setFilter] = useState<FilterValue>('all');

  const hasOrders = allOrders.length > 0;

  type ListItem =
    | { type: 'header'; label: string }
    | { type: 'order'; order: Order };

  const listData: ListItem[] = [];

  if (filter === 'all') {
    if (activeOrders.length > 0) {
      listData.push({ type: 'header', label: t('orders_active') });
      activeOrders.forEach(o => listData.push({ type: 'order', order: o }));
    }
    if (pastOrders.length > 0) {
      listData.push({ type: 'header', label: t('orders_past') });
      pastOrders.forEach(o => listData.push({ type: 'order', order: o }));
    }
  } else {
    allOrders
      .filter(o => o.status === filter)
      .forEach(o => listData.push({ type: 'order', order: o }));
  }

  const navigate = (orderId: string) =>
    router.push({ pathname: '/order-detail', params: { orderId } } as any);

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['bottom', 'left', 'right']}>
      {/* Header */}
      <View
        className="px-4 pb-3 border-b border-slate-100"
        style={{ paddingTop: insets.top + 14 }}
      >
        <Text className="text-slate-900 font-black text-xl text-center">{t('nav_orders')}</Text>
      </View>

      {/* Filter chips — always visible when there are orders */}
      {hasOrders && (
        <FilterChips selected={filter} onChange={setFilter} />
      )}

      {!hasOrders ? (
        <EmptyOrders />
      ) : listData.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-slate-400 text-sm">{t('orders_no_results')}</Text>
        </View>
      ) : (
        <FlatList
          data={listData}
          keyExtractor={(item, i) => item.type === 'order' ? item.order.id : `header-${i}`}
          contentContainerStyle={{ paddingBottom: 100 }}
          renderItem={({ item }) => {
            if (item.type === 'header') return <SectionHeader label={item.label} />;
            return (
              <OrderCard
                order={item.order}
                onPress={() => navigate(item.order.id)}
              />
            );
          }}
        />
      )}
    </SafeAreaView>
  );
};
