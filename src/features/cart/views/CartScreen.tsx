import { ArrowLeft, AlertCircle, Loader, ShieldCheck, RotateCcw } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BillSummaryCard,
  CartItemRow,
  CheckoutBar,
  DeliveryETACard,
  EmptyCart,
  OrderModificationSheet,
  PaymentMethodSection,
  SavingsStrip,
  VariantBottomSheet,
} from '@/src/shared/components';
import type { PaymentMethod, StockInfo } from '@/src/shared/components';
import { deriveCheckoutState } from '@/src/features/cart/domain/checkoutState';
import { buildStockCheckItems } from '@/src/features/cart/domain/stockCheckItems';
import { stockKey } from '@/src/core/store/useCartStockStore';
import type { CartLineItem } from '@/src/base/types/village.types';
import { useCartViewModel } from '../viewmodel/useCartViewModel';
import { useTranslation } from '@/src/core/utils/useTranslation';
import { interpolate } from '@/src/base/constants/translations';
import { LoginBottomSheet } from '@/src/features/auth/views/LoginBottomSheet';
import { useAuthStore, useCartStockStore } from '@/src/core/store';
import { useCartAddressViewModel } from '../viewmodel/useCartAddressViewModel';
import { createOrder } from '../data/orderApi';
import { logger } from '@/src/base/services/logger';

// Stable identity so the sheet does not see a "new" empty array each render.
const EMPTY_STOCK_INFO: StockInfo[] = [];

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
  const [stockConflictInfo, setStockConflictInfo] = React.useState<StockInfo[] | null>(null);

  // Stock verification (use separate selectors to avoid infinite loops)
  const stockStatus = useCartStockStore(state => state.stockStatus);
  const isVerifyingStock = useCartStockStore(state => state.isLoading);
  const stockError = useCartStockStore(state => state.error);
  const verifyCartStock = useCartStockStore(state => state.verifyCartStock);
  const clearStockError = useCartStockStore(state => state.setError);

  const stockCheckItems = React.useMemo(
    () => buildStockCheckItems(vm.cartItems),
    [vm.cartItems],
  );
  // Depend on the *contents*, not the array identity or just its length. Keying
  // on length meant changing an existing line's quantity never re-verified it,
  // so an over-quantity conflict only surfaced after Place Order failed.
  const stockCheckSignature = React.useMemo(
    () => stockCheckItems.map(i => `${i.variantId ?? i.productId}:${i.quantity}`).join('|'),
    [stockCheckItems],
  );

  // Memoised so the sheet's reset effect is not handed a fresh array identity on
  // every CartScreen render (see OrderModificationSheet's signature comment).
  const sheetCartItems = React.useMemo(
    () => vm.cartItems.map(item => ({
      productId: item.productId,
      name: item.name,
      weight: item.weight,
      price: item.price,
      image: item.imageUrl ?? '',
      count: item.count,
    })),
    [vm.cartItems],
  );

  const runStockVerification = React.useCallback(() => {
    if (stockCheckItems.length === 0) return;
    void verifyCartStock(stockCheckItems).catch(() => {
      // The store already records the message; the banner below renders it.
    });
    // stockCheckItems is captured via the signature so a re-ordered but
    // equivalent cart does not refire the request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stockCheckSignature, verifyCartStock]);

  React.useEffect(() => {
    runStockVerification();
  }, [runStockVerification]);

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

  const handleOutOfStockPress = (item: CartLineItem) => {
    const stock = stockStatus[stockKey(item)];
    if (stock && !stock.inStock) {
      setStockConflictInfo([{
        productId: item.productId,
        availableStock: stock.availableQuantity ?? 0,
      }]);
    }
  };

  const handleRetryStockVerification = () => {
    clearStockError(null);
    runStockVerification();
  };

  const handleCheckout = () => {
    setLoginSheetVisible(true);
  };

  // Places the real order once the checkout sheet reaches its 'placing' step.
  // Rejecting here surfaces the retryable error inside the sheet and keeps the
  // cart intact (clearing only happens on the success → onComplete path).
  const handlePlaceOrder = async () => {
    const addressId = addr.selectedAddress?.id;
    if (!addressId) throw new Error('Select a delivery address first.');

    try {
      logger.debug('[handlePlaceOrder] Starting order placement');
      const result = await createOrder({
        products: vm.cartItems.map(item => ({
          productId: item.productId,
          ...(item.variantId ? { variantId: item.variantId } : {}),
          quantity: item.count,
          hasFreeItem: item.hasFreeItem,
        })),
        address: addressId,
        paymentMethod: paymentMethod ?? 'cod',
        isPriority: false,
      });

      logger.debug('[handlePlaceOrder] createOrder returned:', result);

      // Check for stock conflicts
      if (result.stockInfo && result.stockInfo.length > 0) {
        logger.debug('[handlePlaceOrder] Stock conflicts detected:', result.stockInfo);
        setStockConflictInfo(result.stockInfo);
        // Close login sheet to show OrderModificationSheet exclusively
        setLoginSheetVisible(false);
        throw new Error('Stock conflicts detected');
      }

      // Success path
      if (result.orderId) {
        logger.debug('[handlePlaceOrder] Order placed successfully. OrderId:', result.orderId);
        vm.clearCart();
        router.replace('/(dashboard)/orders');
      }
    } catch (error) {
      logger.debug('[handlePlaceOrder] Error:', error);
      throw error;
    }
  };

  const handleLoginComplete = () => {
    setLoginSheetVisible(false);
    vm.clearCart();
    router.replace('/(dashboard)/orders');
  };

  const handleManualAdjustment = (adjustedQuantities: Record<string, number>) => {
    // One store write per line. The previous loop called addToCart/decFromCart
    // once per *unit*, so adjusting an item by 10 fired ten notifications and
    // ten render passes — and bypassed addToCart's maxQuantity guard.
    for (const [productId, newQuantity] of Object.entries(adjustedQuantities)) {
      const cartItem = vm.cartItems.find(i => i.productId === productId);
      if (!cartItem) continue;
      vm.setQuantity(cartItem.key, newQuantity);
    }
    // Clear the conflict state so the sheet closes
    setStockConflictInfo(null);
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
          {/* Stock verification error banner */}
          {stockError && (
            <View className="bg-red-50 border border-red-200 rounded-lg p-3 flex-row items-center gap-2">
              <AlertCircle size={20} color="#dc2626" />
              <View className="flex-1">
                <Text className="text-red-700 font-semibold text-sm">{t('unable_to_verify_stock') || 'Unable to verify stock'}</Text>
                <Text className="text-red-600 text-xs mt-1">{stockError}</Text>
              </View>
              <TouchableOpacity
                onPress={handleRetryStockVerification}
                className="bg-red-600 px-3 py-1 rounded"
              >
                <Text className="text-white text-xs font-semibold flex-row items-center">
                  {isVerifyingStock ? '...' : 'Retry'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Stock verification loading indicator */}
          {isVerifyingStock && !stockError && (
            <View className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex-row items-center gap-2">
              <ActivityIndicator size="small" color="#2563eb" />
              <Text className="text-blue-700 text-sm flex-1">
                {t('verifying_stock') || 'Verifying stock availability...'}
              </Text>
            </View>
          )}

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
                <CartItemRow
                  key={item.key}
                  item={item}
                  stockStatus={stockStatus[stockKey(item)]}
                  onOutOfStockPress={() => handleOutOfStockPress(item)}
                />
              ))}
            </View>
          </View>

          {/* Bill summary */}
          <BillSummaryCard bill={vm.bill} couponApplied={vm.couponApplied} />

          {/* Payment method — always shown (COD preselected) */}
          <PaymentMethodSection selected={paymentMethod} onSelect={setPaymentMethod} />

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
        onPlaceOrder={handlePlaceOrder}
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

      {/* Order Modification Sheet */}
      <OrderModificationSheet
        visible={stockConflictInfo !== null}
        stockInfo={stockConflictInfo ?? EMPTY_STOCK_INFO}
        cartItems={sheetCartItems}
        onClose={() => setStockConflictInfo(null)}
        onRetryCheckout={handlePlaceOrder}
        onManualAdjustment={handleManualAdjustment}
      />
    </SafeAreaView>
  );
};
