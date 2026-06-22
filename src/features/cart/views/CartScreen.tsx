import { ArrowLeft, ShieldCheck } from 'lucide-react-native';
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
  PaymentMethodSection,
  SavingsStrip,
  VariantBottomSheet,
} from '@/src/shared/components';
import type { PaymentMethod } from '@/src/shared/components';
import { deriveCheckoutState } from '@/src/features/cart/domain/checkoutState';
import { useCartViewModel } from '../viewmodel/useCartViewModel';
import { useTranslation } from '@/src/core/utils/useTranslation';
import { interpolate } from '@/src/base/constants/translations';
import { LoginBottomSheet } from '@/src/features/auth/views/LoginBottomSheet';
import { useAuthStore } from '@/src/core/store/useAuthStore';
import { useCartAddressViewModel } from '../viewmodel/useCartAddressViewModel';

export const CartScreen = () => {
  const router = useRouter();
  const vm = useCartViewModel();
  // Cash on delivery is preselected so Place Order is always available; the
  // user can switch to UPI in the inline payment section below the bill.
  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod>('cod');
  const [loginSheetVisible, setLoginSheetVisible] = React.useState(false);
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const scrollPadding = insets.bottom + 16;
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const addr = useCartAddressViewModel();
  const [addressLoginVisible, setAddressLoginVisible] = React.useState(false);
  const [pureLoginVisible, setPureLoginVisible] = React.useState(false);

  const hasAddress = addr.selectedAddress != null;
  const checkoutState = deriveCheckoutState({
    isAuthenticated: addr.isAuthenticated,
    hasAddress,
  });
  const addressLine = addr.selectedAddress
    ? [addr.selectedAddress.addressLine1, addr.selectedAddress.villageName].filter(Boolean).join(', ')
    : undefined;

  const openAddressScreen = () => router.push('/address/add' as any);
  const handleAddressPress = () => {
    if (addr.isAuthenticated) openAddressScreen();
    else setAddressLoginVisible(true);
  };

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
      <SafeAreaView className="flex-1 bg-slate-50" edges={['bottom', 'left', 'right']}>
        <View className="bg-white border-b border-slate-100" style={{ paddingTop: insets.top + 12, paddingBottom: 12, paddingHorizontal: 16 }}>
          <View className="flex-row items-center gap-3">
            <TouchableOpacity onPress={() => router.back()} className="w-8 h-8 items-center justify-center">
              <ArrowLeft size={22} color="#0f172a" />
            </TouchableOpacity>
            <Text className="text-slate-900 font-black text-xl">{t('my_cart')}</Text>
          </View>
        </View>
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

          {/* Bill summary */}
          <BillSummaryCard bill={vm.bill} couponApplied={vm.couponApplied} />

          {/* Payment method — only once authed and an address is selected */}
          {addr.isAuthenticated && hasAddress && (
            <PaymentMethodSection selected={paymentMethod} onSelect={setPaymentMethod} />
          )}

          {/* Trust badge */}
          <View className="flex-row items-center gap-2 justify-center py-2">
            <ShieldCheck size={16} color="#22c55e" />
            <Text className="text-slate-500 text-xs">{t('secure_payments')}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Checkout bar */}
      <CheckoutBar
        state={checkoutState}
        grandTotal={vm.bill.grandTotal}
        addressTag={addr.selectedAddress?.tag}
        addressLine={addressLine}
        onLogin={() => setPureLoginVisible(true)}
        onSelectAddress={handleAddressPress}
        onPlaceOrder={handleCheckout}
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

      {/* Auth gate for the address flow */}
      <LoginBottomSheet
        visible={addressLoginVisible}
        onClose={() => setAddressLoginVisible(false)}
        onComplete={() => {
          setAddressLoginVisible(false);
          openAddressScreen();
        }}
        mode="auth"
      />

      {/* Pure login from the bottom CTA (state 1). On success the bar advances
          on its own because isAuthenticated flips — no navigation. */}
      <LoginBottomSheet
        visible={pureLoginVisible}
        onClose={() => setPureLoginVisible(false)}
        onComplete={() => setPureLoginVisible(false)}
        mode="auth"
      />
    </SafeAreaView>
  );
};
