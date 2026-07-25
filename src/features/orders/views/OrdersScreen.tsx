import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, RefreshControl, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { LogIn, CheckCircle2, Package, Truck, XCircle, RotateCcw } from 'lucide-react-native';
import { Order, OrderItem, OrderStatus } from '@/src/base/types/village.types';
import { rupees } from '@/src/shared/utils/currency';
import { useTranslation } from '@/src/core/utils/useTranslation';
import { interpolate } from '@/src/base/constants/translations';
import { useOrdersViewModel } from '../viewmodel/useOrdersViewModel';
import { useAuthStore } from '@/src/core/store/useAuthStore';
import { useVillageStore } from '@/src/core/store';
import { LoginBottomSheet } from '@/src/features/auth/views/LoginBottomSheet';

// ── Status presentation ──────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  OrderStatus,
  { labelKey: string; color: string; Icon: typeof CheckCircle2 }
> = {
  placed:           { labelKey: 'status_placed',           color: '#d97706', Icon: Package },     // amber-600
  confirmed:        { labelKey: 'status_confirmed',        color: '#2563eb', Icon: CheckCircle2 }, // blue-600
  out_for_delivery: { labelKey: 'status_out_for_delivery', color: '#ea580c', Icon: Truck },        // orange-600
  delivered:        { labelKey: 'status_delivered',        color: '#16a34a', Icon: CheckCircle2 }, // green-600
  cancelled:        { labelKey: 'status_cancelled',        color: '#64748b', Icon: XCircle },       // slate-500
};

// ── Order card ────────────────────────────────────────────────────────────────

function ordinal(d: number): string {
  if (d > 3 && d < 21) return `${d}th`;
  switch (d % 10) {
    case 1:  return `${d}st`;
    case 2:  return `${d}nd`;
    case 3:  return `${d}rd`;
    default: return `${d}th`;
  }
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const day = ordinal(d.getDate());
  const month = d.toLocaleDateString('en-IN', { month: 'short' });
  const year = d.getFullYear();
  let h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, '0');
  const ampm = h >= 12 ? 'pm' : 'am';
  h = h % 12 || 12;
  return `${day} ${month} ${year}, ${h}:${m} ${ampm}`;
}

function ItemThumb({ item }: { item: OrderItem }) {
  if (item.image) {
    return (
      <Image
        source={{ uri: item.image }}
        className="w-12 h-12 rounded-xl border border-slate-100"
        resizeMode="cover"
      />
    );
  }
  return (
    <View className="w-12 h-12 rounded-xl border border-slate-100 bg-slate-50 items-center justify-center">
      <Text className="text-xl">{item.emoji}</Text>
    </View>
  );
}

function OrderCard({
  order,
  onPress,
  onReorder,
}: {
  order: Order;
  onPress: () => void;
  onReorder: () => void;
}) {
  const { t, locale } = useTranslation();
  const teFont = locale === 'te' ? { fontFamily: 'NotoSansTelugu_700Bold' } : undefined;
  const cfg = STATUS_CONFIG[order.status];
  const Icon = cfg.Icon;

  const visibleItems = order.items.slice(0, 3);
  const extraCount = order.items.length - visibleItems.length;

  return (
    <Pressable
      onPress={onPress}
      className="bg-white border border-slate-100 rounded-2xl mb-3 mx-4 overflow-hidden"
      style={({ pressed }) => ({ opacity: pressed ? 0.92 : 1 })}
    >
      <View className="p-4">
        {/* Status + total */}
        <View className="flex-row justify-between items-start">
          <View className="flex-row items-center gap-1.5 flex-1 pr-2">
            <Text
              className="text-slate-900 font-bold text-[15px]"
              style={teFont}
              numberOfLines={1}
            >
              {t(cfg.labelKey)}
            </Text>
            <Icon size={16} color={cfg.color} strokeWidth={2.4} />
          </View>
          <Text className="text-slate-900 font-extrabold text-base">
            {rupees(order.bill.grandTotal)}
          </Text>
        </View>

        {/* Date + time */}
        <Text className="text-slate-400 text-xs mt-0.5">
          {interpolate(t('placed_at'), formatDateTime(order.placedAt))}
        </Text>

        {/* Product thumbnails */}
        {order.items.length > 0 && (
          <View className="flex-row items-center gap-2 mt-3">
            {visibleItems.map((item, i) => (
              <ItemThumb key={i} item={item} />
            ))}
            {extraCount > 0 && (
              <View className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 items-center justify-center">
                <Text className="text-slate-500 text-xs font-bold">+{extraCount}</Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Order Again — single full-width action (no rate / no menu) */}
      <Pressable
        onPress={onReorder}
        className="border-t border-slate-100 py-3.5 items-center active:bg-slate-50"
      >
        <View className="flex-row items-center gap-1.5">
          <RotateCcw size={15} color="#16a34a" strokeWidth={2.6} />
          <Text className="text-green-600 font-bold text-sm" style={teFont}>
            {t('order_again')}
          </Text>
        </View>
      </Pressable>
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
        onPress={() => router.push('/(dashboard)/home')}
        className="bg-green-600 rounded-2xl px-8 py-3"
        activeOpacity={0.85}
      >
        <Text className="text-white font-bold text-sm">{t('shop_now')}</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Signed-out state ──────────────────────────────────────────────────────────

function OrdersSignedOut({ onLogin }: { onLogin: () => void }) {
  const { t } = useTranslation();
  return (
    <View className="flex-1 items-center justify-center px-8">
      <OrderIllustration />
      <Text className="text-slate-900 font-black text-2xl mt-4 mb-2 text-center">
        {t('orders_login_title')}
      </Text>
      <Text className="text-slate-500 text-sm text-center mb-8 leading-5">
        {t('orders_login_subtitle')}
      </Text>
      <TouchableOpacity
        onPress={onLogin}
        className="bg-green-600 rounded-2xl px-8 py-3 flex-row items-center gap-2"
        activeOpacity={0.85}
      >
        <LogIn size={18} color="#fff" strokeWidth={2.6} />
        <Text className="text-white font-bold text-sm">{t('sign_in_btn')}</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export const OrdersScreen = () => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const addToCart = useVillageStore(s => s.addToCart);
  const clearCart = useVillageStore(s => s.clearCart);
  const { allOrders, activeOrders, pastOrders, isLoading, isError, refetch, isRefetching } = useOrdersViewModel();
  const [loginVisible, setLoginVisible] = useState(false);

  // Tabs stay mounted, so a plain mount-time fetch never re-runs on return.
  // Refetch whenever the Orders tab regains focus (only while signed in, since
  // a manual refetch ignores the query's `enabled` guard and would 401).
  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated) refetch();
    }, [isAuthenticated, refetch]),
  );

  const reorder = (order: Order) => {
    clearCart();
    for (const item of order.items) {
      for (let i = 0; i < item.quantity; i++) addToCart(item.productId);
    }
    router.push('/cart');
  };

  const hasOrders = allOrders.length > 0;

  type ListItem =
    | { type: 'header'; label: string }
    | { type: 'order'; order: Order };

  const listData: ListItem[] = [];

  if (activeOrders.length > 0) {
    listData.push({ type: 'header', label: t('orders_active') });
    activeOrders.forEach(o => listData.push({ type: 'order', order: o }));
  }
  if (pastOrders.length > 0) {
    listData.push({ type: 'header', label: t('orders_past') });
    pastOrders.forEach(o => listData.push({ type: 'order', order: o }));
  }

  const navigate = (orderId: string) =>
    router.push({ pathname: '/order-detail', params: { orderId } });

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['bottom', 'left', 'right']}>
      {/* Header */}
      <View
        className="px-4 pb-3 border-b border-slate-100"
        style={{ paddingTop: insets.top + 14 }}
      >
        <Text className="text-slate-900 font-black text-xl text-center">{t('nav_orders')}</Text>
      </View>


      {!isAuthenticated ? (
        <OrdersSignedOut onLogin={() => setLoginVisible(true)} />
      ) : isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#16a34a" />
        </View>
      ) : isError ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-slate-500 text-sm text-center">{t('orders_load_error')}</Text>
        </View>
      ) : !hasOrders ? (
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
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#16a34a" colors={['#16a34a']} />
          }
          renderItem={({ item }) => {
            if (item.type === 'header') return <SectionHeader label={item.label} />;
            return (
              <OrderCard
                order={item.order}
                onPress={() => navigate(item.order.id)}
                onReorder={() => reorder(item.order)}
              />
            );
          }}
        />
      )}

      <LoginBottomSheet
        mode="auth"
        visible={loginVisible}
        onClose={() => setLoginVisible(false)}
        onComplete={() => setLoginVisible(false)}
      />
    </SafeAreaView>
  );
};
