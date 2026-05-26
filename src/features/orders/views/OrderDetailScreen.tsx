import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  MapPin,
  Package,
  Truck,
  XCircle,
} from 'lucide-react-native';
import React, { useEffect } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { OrderStatus } from '@/src/base/types/village.types';
import { rupees } from '@/src/features/home/data/static/villageData';
import { interpolate } from '@/src/base/constants/translations';
import { useTranslation } from '@/src/core/utils/useTranslation';
import { BillSummaryCard } from '@/src/shared/components/BillSummaryCard';
import { useOrderDetailViewModel } from '../viewmodel/useOrderDetailViewModel';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

// ── Status banner ─────────────────────────────────────────────────────────────

const STATUS_BANNER: Record<OrderStatus, { bg: string; text: string; label: string; icon: React.ReactNode }> = {
  placed:           { bg: 'bg-amber-50',  text: 'text-amber-700',  label: 'status_placed',           icon: <Package size={28} color="#b45309" /> },
  confirmed:        { bg: 'bg-blue-50',   text: 'text-blue-700',   label: 'status_confirmed',         icon: <CheckCircle2 size={28} color="#1d4ed8" /> },
  out_for_delivery: { bg: 'bg-orange-50', text: 'text-orange-700', label: 'status_out_for_delivery',  icon: <Truck size={28} color="#c2410c" /> },
  delivered:        { bg: 'bg-green-50',  text: 'text-green-700',  label: 'status_delivered',         icon: <CheckCircle2 size={28} color="#15803d" /> },
  cancelled:        { bg: 'bg-red-50',    text: 'text-red-700',    label: 'status_cancelled',         icon: <XCircle size={28} color="#b91c1c" /> },
};

// ── Status timeline ───────────────────────────────────────────────────────────

const TIMELINE_STEPS: Array<{ key: OrderStatus; labelKey: string }> = [
  { key: 'placed',           labelKey: 'status_placed'           },
  { key: 'confirmed',        labelKey: 'status_confirmed'        },
  { key: 'out_for_delivery', labelKey: 'status_out_for_delivery' },
  { key: 'delivered',        labelKey: 'status_delivered'        },
];

const STATUS_ORDER: Record<OrderStatus, number> = {
  placed:           0,
  confirmed:        1,
  out_for_delivery: 2,
  delivered:        3,
  cancelled:        -1,
};

function StatusTimeline({ status }: { status: OrderStatus }) {
  const { t } = useTranslation();
  const currentIdx = STATUS_ORDER[status];

  return (
    <View className="bg-white rounded-2xl p-4 mb-3">
      {TIMELINE_STEPS.map((step, idx) => {
        const done    = idx < currentIdx;
        const current = idx === currentIdx;
        const isLast  = idx === TIMELINE_STEPS.length - 1;

        return (
          <View key={step.key} className="flex-row items-start">
            {/* Dot + line */}
            <View className="items-center mr-3" style={{ width: 20 }}>
              <View
                className={`w-5 h-5 rounded-full items-center justify-center
                  ${done || current ? 'bg-green-500' : 'bg-slate-200'}`}
              >
                {(done || current) && <CheckCircle2 size={12} color="#fff" />}
                {!done && !current && <Circle size={12} color="#94a3b8" />}
              </View>
              {!isLast && (
                <View className={`w-0.5 h-8 ${done ? 'bg-green-400' : 'bg-slate-200'}`} />
              )}
            </View>

            {/* Label */}
            <Text
              className={`text-sm mt-0.5 ${done || current ? 'text-slate-900 font-semibold' : 'text-slate-400'}`}
            >
              {t(step.labelKey)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export const OrderDetailScreen = () => {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { orderId, order, handleReorder } = useOrderDetailViewModel();
  const teFont = locale === 'te' ? { fontFamily: 'NotoSansTelugu_700Bold' } : undefined;

  useEffect(() => {
    if (orderId && !order) {
      router.back();
    }
  }, [orderId, order, router]);

  if (!order) return null;

  const banner = STATUS_BANNER[order.status];
  const isCancelled = order.status === 'cancelled';
  const BOTTOM_BAR_H = 80;

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['bottom', 'left', 'right']}>
      {/* Header */}
      <View className="flex-row items-center px-4 gap-3" style={{ paddingTop: insets.top + 8, paddingBottom: 12 }}>
        <Pressable onPress={() => router.back()} className="p-1">
          <ArrowLeft size={22} color="#0f172a" />
        </Pressable>
        <Text className="text-slate-900 font-bold text-lg flex-1" style={teFont}>
          {interpolate(t('order_id'), order.id)}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: isCancelled ? 24 : BOTTOM_BAR_H + 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Status banner */}
        <View className={`mx-4 mb-3 rounded-2xl p-4 flex-row items-center gap-3 ${banner.bg}`}>
          {banner.icon}
          <View>
            <Text className={`font-bold text-base ${banner.text}`} style={teFont}>
              {t(banner.label)}
            </Text>
            <Text className="text-slate-500 text-xs mt-0.5">{formatDate(order.placedAt)}</Text>
          </View>
        </View>

        {/* Timeline (hidden for cancelled) */}
        {!isCancelled && (
          <View className="mx-4">
            <StatusTimeline status={order.status} />
          </View>
        )}

        {/* Items */}
        <View className="bg-white rounded-2xl mx-4 mb-3 p-4">
          <Text className="text-slate-500 text-xs font-bold tracking-wider uppercase mb-3">
            {t('your_items')}
          </Text>
          {order.items.map((item, i) => (
            <View key={i} className="flex-row items-center mb-2">
              <Text className="text-2xl mr-3">{item.emoji}</Text>
              <View className="flex-1">
                <Text className="text-slate-900 text-sm font-medium">
                  {locale === 'te' ? item.nameTE : item.name}
                </Text>
                <Text className="text-slate-400 text-xs">{item.weight}</Text>
              </View>
              <Text className="text-slate-600 text-sm">
                {item.quantity} × {rupees(item.price)}
              </Text>
            </View>
          ))}
        </View>

        {/* Bill summary */}
        <View className="mx-4 mb-3">
          <BillSummaryCard bill={order.bill} />
        </View>

        {/* Delivery address */}
        <View className="bg-white rounded-2xl mx-4 mb-3 p-4 flex-row items-start gap-3">
          <MapPin size={18} color="#64748b" style={{ marginTop: 2 }} />
          <View className="flex-1">
            <Text className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">
              {t('delivery_address_label')}
            </Text>
            <Text className="text-slate-700 text-sm">{order.deliveryAddress}</Text>
          </View>
        </View>

        {/* Payment method */}
        <View className="bg-white rounded-2xl mx-4 mb-3 p-4 flex-row justify-between items-center">
          <Text className="text-slate-500 text-sm">{t('payment_method_used')}</Text>
          <View className="bg-slate-100 rounded-full px-3 py-1">
            <Text className="text-slate-700 text-sm font-semibold">
              {order.paymentMethod === 'cod' ? t('cod') : t('upi')}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Sticky reorder bar (hidden for cancelled) */}
      {!isCancelled && (
        <View
          className="absolute left-0 right-0 bg-white border-t border-slate-100 px-4 pt-3"
          style={{ bottom: insets.bottom, paddingBottom: insets.bottom > 0 ? 4 : 12 }}
        >
          <Pressable
            onPress={() => { handleReorder(); router.push('/cart' as any); }}
            className="bg-green-500 rounded-2xl py-4 items-center"
            style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
          >
            <Text className="text-white font-bold text-base" style={teFont}>
              {t('reorder_btn')}
            </Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
};
