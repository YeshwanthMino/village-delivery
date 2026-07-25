import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  MapPin,
  MessageCircle,
  Package,
  Truck,
  XCircle,
} from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, Image, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Order } from '@/src/base/types/village.types';
import { rupees } from '@/src/shared/utils/currency';
import { interpolate } from '@/src/base/constants/translations';
import { useTranslation } from '@/src/core/utils/useTranslation';
import { BillSummaryCard } from '@/src/shared/components/BillSummaryCard';
import { openWhatsAppSupport } from '@/src/shared/utils/whatsappSupport';
import { useOrderDetailViewModel } from '../viewmodel/useOrderDetailViewModel';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

// ── Derived order progress from server status ─────────────────────────────────
//
// Orders use the server status directly: if the server says 'out_for_delivery',
// show that; otherwise show 'preparing' until server marks as delivered/cancelled.

type ViewStatus = 'preparing' | 'out_for_delivery' | 'delivered' | 'cancelled';

function deriveViewStatus(order: Order): { status: ViewStatus; remainingMin: number } {
  if (order.status === 'delivered') return { status: 'delivered', remainingMin: 0 };
  if (order.status === 'cancelled') return { status: 'cancelled', remainingMin: 0 };
  if (order.status === 'out_for_delivery') return { status: 'out_for_delivery', remainingMin: 0 };
  return { status: 'preparing', remainingMin: 0 };
}

// ── Status banner ─────────────────────────────────────────────────────────────

const VIEW_BANNER: Record<ViewStatus, { bg: string; text: string; label: string; icon: React.ReactNode }> = {
  preparing:        { bg: 'bg-amber-50',  text: 'text-amber-700',  label: 'status_preparing',        icon: <Package size={28} color="#b45309" /> },
  out_for_delivery: { bg: 'bg-orange-50', text: 'text-orange-700', label: 'status_out_for_delivery', icon: <Truck size={28} color="#c2410c" /> },
  delivered:        { bg: 'bg-green-50',  text: 'text-green-700',  label: 'status_delivered',        icon: <CheckCircle2 size={28} color="#15803d" /> },
  cancelled:        { bg: 'bg-red-50',    text: 'text-red-700',    label: 'status_cancelled',        icon: <XCircle size={28} color="#b91c1c" /> },
};

// ── Status timeline ───────────────────────────────────────────────────────────

const TIMELINE_STEPS: { key: ViewStatus; labelKey: string }[] = [
  { key: 'preparing',        labelKey: 'status_preparing'        },
  { key: 'out_for_delivery', labelKey: 'status_out_for_delivery' },
  { key: 'delivered',        labelKey: 'status_delivered'        },
];

const VIEW_ORDER: Record<ViewStatus, number> = {
  preparing:        0,
  out_for_delivery: 1,
  delivered:        2,
  cancelled:        -1,
};

function StatusTimeline({ status }: { status: ViewStatus }) {
  const { t } = useTranslation();
  const currentIdx = VIEW_ORDER[status];

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
  const { order, isLoading, handleReorder, refetch, isRefetching } = useOrderDetailViewModel();
  const teFont = locale === 'te' ? { fontFamily: 'NotoSansTelugu_700Bold' } : undefined;

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50" edges={['bottom', 'left', 'right']}>
        <View className="px-4" style={{ paddingTop: insets.top + 8, paddingBottom: 12 }}>
          <Pressable onPress={() => router.back()} className="p-1 self-start">
            <ArrowLeft size={22} color="#0f172a" />
          </Pressable>
        </View>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#16a34a" />
        </View>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50" edges={['bottom', 'left', 'right']}>
        <View className="px-4" style={{ paddingTop: insets.top + 8, paddingBottom: 12 }}>
          <Pressable
            onPress={() => router.replace('/(dashboard)/orders' as any)}
            className="p-1 self-start"
          >
            <ArrowLeft size={22} color="#0f172a" />
          </Pressable>
        </View>
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-4xl mb-4">📦</Text>
          <Text className="text-slate-900 font-bold text-lg mb-2 text-center">Order not found</Text>
          <Text className="text-slate-500 text-sm text-center mb-6">
            This order does not exist or may have been removed.
          </Text>
          <Pressable
            onPress={() => router.replace('/(dashboard)/orders' as any)}
            className="bg-green-500 rounded-2xl px-8 py-3"
            style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
          >
            <Text className="text-white font-bold text-base">View all orders</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const { status: viewStatus } = deriveViewStatus(order);
  const banner = VIEW_BANNER[viewStatus];
  const isCancelled = viewStatus === 'cancelled';
  const bannerSub =
    viewStatus === 'preparing'        ? formatDate(order.placedAt)
    : viewStatus === 'out_for_delivery' ? t('on_the_way')
    : formatDate(order.placedAt);
  const BOTTOM_BAR_H = 80;

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['bottom', 'left', 'right']}>
      {/* Header */}
      <View className="flex-row items-center px-4 gap-3" style={{ paddingTop: insets.top + 8, paddingBottom: 12 }}>
        <Pressable onPress={() => router.back()} className="p-1">
          <ArrowLeft size={22} color="#0f172a" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-slate-900 font-bold text-lg" style={teFont}>
            {t('order_details')}
          </Text>
          <Text className="text-slate-400 text-xs mt-0.5">{formatDate(order.placedAt)}</Text>
        </View>
        <Pressable
          onPress={() => openWhatsAppSupport(interpolate(t('order_help_msg'), order.id))}
          className="flex-row items-center gap-1.5 border border-slate-200 rounded-full px-3 py-1.5 active:bg-slate-50"
        >
          <MessageCircle size={15} color="#16a34a" strokeWidth={2.4} />
          <Text className="text-green-600 font-bold text-xs" style={teFont}>
            {t('get_help')}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: isCancelled ? 24 : BOTTOM_BAR_H + 24 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#16a34a" colors={['#16a34a']} />
        }
      >
        {/* Status banner */}
        <View className={`mx-4 mb-3 rounded-2xl p-4 flex-row items-center gap-3 ${banner.bg}`}>
          {banner.icon}
          <View>
            <Text className={`font-bold text-base ${banner.text}`} style={teFont}>
              {t(banner.label)}
            </Text>
            <Text className="text-slate-500 text-xs mt-0.5">{bannerSub}</Text>
          </View>
        </View>

        {/* Timeline (hidden for cancelled) */}
        {!isCancelled && (
          <View className="mx-4">
            <StatusTimeline status={viewStatus} />
          </View>
        )}

        {/* Items */}
        <View className="bg-white rounded-2xl mx-4 mb-3 p-4">
          <Text className="text-slate-500 text-xs font-bold tracking-wider uppercase mb-3">
            {t('your_items')}
          </Text>
          {order.items.map((item, i) => (
            <View key={i} className="flex-row items-center mb-2">
              {item.image ? (
                <Image
                  source={{ uri: item.image }}
                  className="w-11 h-11 rounded-xl border border-slate-100 mr-3"
                  resizeMode="cover"
                />
              ) : (
                <View className="w-11 h-11 rounded-xl border border-slate-100 bg-slate-50 items-center justify-center mr-3">
                  <Text className="text-xl">{item.emoji}</Text>
                </View>
              )}
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
          <BillSummaryCard bill={order.bill} couponApplied={order.bill.couponDiscount > 0} />
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
