import { ArrowLeft, MapPin, ShieldCheck } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BillSummaryCard,
  CartItemRow,
  CheckoutBar,
  DeliveryETACard,
  EmptyCart,
  MiniProductCard,
  SavingsStrip,
  VariantBottomSheet,
} from '@/src/shared/components';
import { useCartViewModel } from '../viewmodel/useCartViewModel';
import { PaymentMethod } from '@/src/shared/components/CheckoutBar';
import { useTranslation } from '@/src/core/utils/useTranslation';
import { interpolate } from '@/src/base/constants/translations';
import { LoginBottomSheet } from '@/src/features/auth/views/LoginBottomSheet';
import { useAuthStore } from '@/src/core/store/useAuthStore';

export const CartScreen = () => {
  const router = useRouter();
  const vm = useCartViewModel();
  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod>(null);
  const [loginSheetVisible, setLoginSheetVisible] = React.useState(false);
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const scrollPadding = insets.bottom + 16;
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);

  const goToHome = () => router.push('/(dashboard)/home');

  const handleCheckout = () => {
    setLoginSheetVisible(true);
  };

  const handleLoginComplete = () => {
    setLoginSheetVisible(false);
    vm.clearCart();
    router.replace('/(dashboard)/orders');
  };

  if (vm.cartCount === 0) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50">
        <EmptyCart onStartShopping={goToHome} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['bottom', 'left', 'right']}>
      {/* Sticky Header */}
      <View className="bg-white border-b border-slate-100" style={{ paddingTop: insets.top + 12, paddingBottom: 12, paddingHorizontal: 16 }}>
        <View className="flex-row items-center gap-3">
          <TouchableOpacity onPress={() => router.back()} className="w-8 h-8 items-center justify-center">
            <ArrowLeft size={22} color="#0f172a" />
          </TouchableOpacity>
          <View>
            <Text className="text-slate-900 font-black text-xl">{t('my_cart')}</Text>
            <Text className="text-slate-500 text-sm mt-0.5">
              {vm.cartCount === 1 ? t('item_count').replace('{n}', '1') : interpolate(t('n_items_cart'), vm.cartCount)}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: scrollPadding }}
        decelerationRate="normal"
        scrollEventThrottle={16}
        bounces={true}
        alwaysBounceVertical={true}
        overScrollMode="always"
      >
        <View className="px-4 py-3 gap-3">
          {/* Delivery ETA */}
          <DeliveryETACard />

          {/* Savings strip */}
          <SavingsStrip savings={vm.bill.totalSavings} />

          {/* Items */}
          <View>
            <Text className="text-slate-500 text-[10px] font-bold tracking-widest mb-2 uppercase">
              {t('your_items')}
            </Text>
            <View className="gap-2">
              {vm.cartItems.map(item => (
                <CartItemRow key={item.key} item={item} />
              ))}
            </View>
          </View>

          {/* Frequently Bought Together */}
          {vm.fbtProducts.length > 0 && (
            <View>
              <Text className="text-slate-500 text-[10px] font-bold tracking-widest mb-2 uppercase">
                {t('fbt')}
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 10 }}
              >
                {vm.fbtProducts.map(product => (
                  <MiniProductCard
                    key={product.id}
                    product={product}
                    openVariants={vm.openVariants}
                  />
                ))}
              </ScrollView>
            </View>
          )}

          {/* Bill summary */}
          <BillSummaryCard bill={vm.bill} />

          {/* Delivery address */}
          <View className="bg-white border border-slate-200 rounded-2xl p-4 flex-row items-start gap-3">
            <MapPin size={18} color="#16a34a" className="mt-0.5" />
            <View className="flex-1">
              <Text className="text-slate-900 font-bold text-sm">{t('delivering_to_home')}</Text>
              <Text className="text-slate-500 text-xs mt-0.5">
                221B Baker Street, Apartment 4B, Mumbai 400001
              </Text>
            </View>
            <TouchableOpacity>
              <Text className="text-green-600 font-bold text-sm">{t('change')}</Text>
            </TouchableOpacity>
          </View>

          {/* Trust badge */}
          <View className="flex-row items-center gap-2 justify-center py-2">
            <ShieldCheck size={16} color="#22c55e" />
            <Text className="text-slate-500 text-xs">{t('secure_payments')}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Checkout bar */}
      <CheckoutBar
        grandTotal={vm.bill.grandTotal}
        savings={vm.bill.totalSavings}
        paymentMethod={paymentMethod}
        onSelectPayment={setPaymentMethod}
        onCheckout={handleCheckout}
      />

      {/* Variant sheet */}
      <VariantBottomSheet product={vm.variantProduct} onClose={vm.closeVariants} />

      {/* Deferred login / checkout sheet */}
      <LoginBottomSheet
        visible={loginSheetVisible}
        onClose={() => setLoginSheetVisible(false)}
        onComplete={handleLoginComplete}
        initialStep={isAuthenticated ? 'placing' : 'phone'}
        itemCount={vm.bill.totalCount}
        grandTotal={Math.round(vm.bill.grandTotal)}
      />
    </SafeAreaView>
  );
};
