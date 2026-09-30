import { ArrowLeft, AlertCircle, ShieldCheck } from 'lucide-react-native';
import { useGuardedRouter } from '@/src/shared/hooks/useGuardedRouter';
import { useBackAction } from '@/src/shared/hooks/useBackAction';
import { useScreenFocused } from '@/src/shared/hooks/useScreenActive';
import { useSingleFlight } from '@/src/shared/hooks/useSingleFlight';
import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BillSummaryCard,
  CartItemRow,
  CashbackProgressBanner,
  CheckoutBar,
  DeliveryETACard,
  EmptyCart,
  OrderModificationSheet,
  PaymentMethodSection,
  SavingsStrip,
  VariantBottomSheet,
  WalletApplyCard,
} from '@/src/shared/components';
import type { PaymentMethod, StockInfo } from '@/src/shared/components';
import { deriveCheckoutState } from '@/src/features/cart/domain/checkoutState';
import { buildStockCheckItems } from '@/src/features/cart/domain/stockCheckItems';
import { buildStockConflicts } from '@/src/features/cart/domain/stockConflicts';
import { stockKey } from '@/src/core/store/useCartStockStore';
import { useCartViewModel } from '../viewmodel/useCartViewModel';
import { useCartCashback } from '@/src/features/cart/domain/useCartCashback';
import { useTranslation } from '@/src/core/utils/useTranslation';
import { interpolate } from '@/src/base/constants/translations';
import { LoginBottomSheet } from '@/src/features/auth/views/LoginBottomSheet';
import { getStoreTimings, useAuthStore, useCartStockStore, useVillageStore } from '@/src/core/store';
import { getCartItems } from '@/src/features/cart/domain/bill';
import { useLocationStore } from '@/src/core/store/useLocationStore';
import { useCartAddressViewModel } from '../viewmodel/useCartAddressViewModel';
import { useCreateOrderMutation } from '../data/mutations/useCreateOrderMutation';
import { logger } from '@/src/base/services/logger';
import { StoreClosedSheet } from '@/src/features/storeConfig/views/StoreClosedSheet';
import {
  getStoreStatus,
  needsStoreClosedNotice,
  type StoreStatus,
} from '@/src/features/storeConfig/domain/storeStatus';

// Stable identity so the sheet does not see a "new" empty array each render.
const EMPTY_STOCK_INFO: StockInfo[] = [];

export const CartScreen = () => {
  const router = useGuardedRouter();
  const goBack = useBackAction(() => router.back('/(dashboard)/home'));
  const vm = useCartViewModel();
  // Independent from CashbackProgressBanner's own useCartCashback call — the
  // same accepted-duplication pattern used elsewhere in this screen. Needed
  // here to pass the unlocked reward into BillSummaryCard as a prop.
  const cashback = useCartCashback(vm.bill.grandTotalBeforeWallet);
  // Cash on delivery is preselected so Place Order is always available; the
  // user can switch to UPI in the inline payment section below the bill.
  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod>('cod');
  // Which purpose the login sheet is currently open for, or null when closed.
  // Three independent booleans previously allowed contradictory combinations.
  type SheetKind = 'checkout' | 'address-gate' | 'login';
  const [sheet, setSheet] = React.useState<SheetKind | null>(null);
  const sheetRef = React.useRef(sheet);
  sheetRef.current = sheet;
  const closeSheet = () => setSheet(null);
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const scrollPadding = insets.bottom + 16;
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const addr = useCartAddressViewModel();
  const [stockConflictInfo, setStockConflictInfo] = React.useState<StockInfo[] | null>(null);
  const stockConflictAfterLogin = React.useRef<StockInfo[] | null>(null);
  const afterLogin = React.useRef<'address' | 'orders' | null>(null);
  // Measured height of the CheckoutBar (fixed at the true bottom of the screen)
  // so the stock-limit snackbar, which floats at `bottom: 0` of each stepper's
  // nearest positioned ancestor, can be offset above it instead of covering it.
  const [checkoutBarHeight, setCheckoutBarHeight] = React.useState(0);

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
  // Inventory is per store (x-store-id), so a changed delivery address can change
  // availability even when the cart is untouched. The address id is included
  // because selectAddress sets it only after the new store is persisted, which is
  // what apiClient reads for the header; the storeId alone can fire too early.
  const activeStoreId = useLocationStore(state => state.serviceableVillage?.storeId);
  const stockCheckSignature = React.useMemo(
    () => [
      stockCheckItems.map(i => `${i.variantId ?? i.productId}:${i.quantity}`).join('|'),
      activeStoreId ?? '',
      addr.selectedAddress?.id ?? '',
    ].join('@'),
    [stockCheckItems, activeStoreId, addr.selectedAddress?.id],
  );

  // Memoised so the sheet's reset effect is not handed a fresh array identity on
  // every CartScreen render (see OrderModificationSheet's signature comment).
  const sheetCartItems = React.useMemo(
    () => vm.cartItems.map(item => ({
      key: item.key,
      productId: item.productId,
      variantId: item.variantId,
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

  // Lines the proactive stock check says cannot be fulfilled as quantified —
  // no stock at all, or less than the cart already holds.
  const stockConflicts = buildStockConflicts(vm.cartItems, stockStatus);
  // Any conflicting line blocks Place Order until the customer removes it or
  // lowers its quantity. Unchecked/failed checks are never conflicts (fail open).
  const hasStockConflict = stockConflicts.length > 0;

  const hasAddress = addr.selectedAddress != null;
  const checkoutState = deriveCheckoutState({
    isAuthenticated: addr.isAuthenticated,
    hasAddress,
    belowMinimum: vm.bill.belowMinimum,
    outOfStock: hasStockConflict,
  });
  const addressLine = addr.selectedAddress
    ? [addr.selectedAddress.addressLine1, addr.selectedAddress.villageName].filter(Boolean).join(', ')
    : undefined;

  const openAddressScreen = () => router.push('/address/add');
  const handleAddressPress = () => {
    if (addr.isAuthenticated) openAddressScreen();
    else setSheet('address-gate');
  };

  const goToHome = () => router.dismissTo('/(dashboard)/home');

  const handleRetryStockVerification = () => {
    clearStockError(null);
    runStockVerification();
  };

  // Store status is recomputed at the moment of pressing Place Order — never a
  // value captured when the cart rendered — so a cart left open across opening
  // or closing time still gets the right message.
  const [storeNotice, setStoreNotice] = React.useState<StoreStatus | null>(null);
  const focused = useScreenFocused();
  const focusedRef = React.useRef(focused);
  focusedRef.current = focused;
  const checkoutAfterNotice = React.useRef(false);
  React.useEffect(() => {
    if (!focused) {
      checkoutAfterNotice.current = false;
      stockConflictAfterLogin.current = null;
      afterLogin.current = null;
      setStoreNotice(null);
      setStockConflictInfo(null);
    }
  }, [focused]);
  const handleCheckout = () => {
    // Defensive: the bar is already blocked while any line conflicts (see
    // checkoutState), so this only fires if a check lands between render and tap.
    if (stockConflicts.length > 0) {
      setStockConflictInfo(stockConflicts);
      return;
    }
    const status = getStoreStatus(getStoreTimings());
    if (needsStoreClosedNotice(status)) setStoreNotice(status);
    else setSheet('checkout');
  };
  const confirmClosedStoreCheckout = () => {
    checkoutAfterNotice.current = true;
    setStoreNotice(null);
  };
  const finishStoreNoticeDismissal = () => {
    if (!checkoutAfterNotice.current) return;
    checkoutAfterNotice.current = false;
    if (focused) setSheet('checkout');
  };
  const finishLoginDismissal = () => {
    const destination = afterLogin.current;
    afterLogin.current = null;
    if (destination && focused) {
      if (destination === 'orders') {
        vm.clearCart();
        router.dismissTo('/(dashboard)/orders');
      } else {
        openAddressScreen();
      }
      return;
    }
    const pending = stockConflictAfterLogin.current;
    stockConflictAfterLogin.current = null;
    if (pending && focused) setStockConflictInfo(pending);
  };

  const createOrderMutation = useCreateOrderMutation();

  // Places the real order once the checkout sheet reaches its 'placing' step.
  // Rejecting here surfaces the retryable error inside the sheet and keeps the
  // cart intact (clearing only happens on the success → onComplete path).
  const handlePlaceOrder = useSingleFlight(async () => {
    const startedInLogin = sheetRef.current === 'checkout';
    const addressId = addr.selectedAddress?.id;
    if (!addressId) throw new Error('Select a delivery address first.');

    // The conflict sheet writes capped quantities immediately before calling
    // this function. Read the live store here: vm.cartItems belongs to the
    // previous render and would otherwise submit the old quantities again.
    const currentCart = useVillageStore.getState();
    const currentItems = getCartItems(currentCart.cart, currentCart.cartSnapshots);
    if (currentItems.length === 0) throw new Error('Your cart is empty.');

    try {
      logger.debug('[handlePlaceOrder] Starting order placement');
      const result = await createOrderMutation.mutateAsync({
        products: currentItems.map(item => ({
          productId: item.productId,
          ...(item.variantId ? { variantId: item.variantId } : {}),
          quantity: item.count,
          hasFreeItem: item.hasFreeItem,
        })),
        address: addressId,
        paymentMethod: paymentMethod ?? 'cod',
        isPriority: false,
        useWallet: vm.walletApplied && vm.bill.walletDiscount > 0,
      });

      logger.debug('[handlePlaceOrder] createOrder returned:', result);

      // Check for stock conflicts
      if (result.stockInfo && result.stockInfo.length > 0) {
        logger.debug('[handlePlaceOrder] Stock conflicts detected:', result.stockInfo);
        if (sheetRef.current !== null) {
          // iOS cannot safely present the conflict Modal while the login Modal
          // is still dismissing. The native onDismiss handoff opens it later.
          stockConflictAfterLogin.current = result.stockInfo;
          closeSheet();
        } else {
          setStockConflictInfo(result.stockInfo);
        }
        throw new Error('Stock conflicts detected');
      }

      // Success path
      if (result.orderId) {
        logger.debug('[handlePlaceOrder] Order placed successfully. OrderId:', result.orderId);
        // The login flow owns its success step. It will close first, then
        // navigate from the native dismissal callback. Conflict-sheet retries
        // have no login flow and can finish immediately.
        if (!startedInLogin || sheetRef.current !== 'checkout') {
          vm.clearCart();
          setStockConflictInfo(null);
          if (focusedRef.current) router.dismissTo('/(dashboard)/orders');
        }
      } else {
        throw new Error('Order could not be confirmed. Please try again.');
      }
    } catch (error) {
      logger.debug('[handlePlaceOrder] Error:', error);
      throw error;
    }
  });

  const handleLoginComplete = () => {
    afterLogin.current = 'orders';
    closeSheet();
  };

  const handleManualAdjustment = (adjustedQuantities: Record<string, number>) => {
    // One store write per line. The previous loop called addToCart/decFromCart
    // once per *unit*, so adjusting an item by 10 fired ten notifications and
    // ten render passes — and bypassed addToCart's maxQuantity guard.
    for (const [key, newQuantity] of Object.entries(adjustedQuantities)) {
      const cartItem = vm.cartItems.find(i => i.key === key);
      if (!cartItem) continue;
      vm.setQuantity(cartItem.key, newQuantity);
    }
    // Keep the conflict sheet visible while checkout retries. It closes on
    // success/navigation or an explicit cancel, and shows any retry error.
  };

  if (vm.cartCount === 0) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50" edges={['bottom', 'left', 'right']}>
        <View className="bg-white border-b border-slate-100" style={{ paddingTop: insets.top + 12, paddingBottom: 12, paddingHorizontal: 16 }}>
          <View className="flex-row items-center gap-3">
            <TouchableOpacity onPress={goBack} className="w-8 h-8 items-center justify-center">
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
          <TouchableOpacity onPress={goBack} className="w-8 h-8 items-center justify-center">
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

          {/* Cashback progress */}
          <CashbackProgressBanner grandTotal={vm.bill.grandTotalBeforeWallet} />

          {/* Wallet balance — addable like a product line item, applied by
              default when a balance exists (see useCartViewModel). VIP
              membership upsell is hidden here for now, unrelated to wallet. */}
          <WalletApplyCard
            balance={vm.walletBalance}
            appliedAmount={vm.bill.walletDiscount}
            applied={vm.walletApplied}
            onApply={vm.applyWallet}
            onRemove={vm.removeWallet}
          />

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
                  bottomOffset={checkoutBarHeight}
                />
              ))}
            </View>
          </View>

          {/* Bill summary */}
          <BillSummaryCard
            bill={vm.bill}
            couponApplied={vm.couponApplied}
            walletApplied={vm.walletApplied}
            cashbackReward={cashback.unlockedReward}
          />

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
      <View onLayout={e => setCheckoutBarHeight(e.nativeEvent.layout.height)}>
        <CheckoutBar
          state={checkoutState}
          grandTotal={vm.bill.grandTotal}
          amountToMinimum={vm.bill.amountToMinimum}
          minOrderValue={vm.bill.minOrderValue}
          addressTag={addr.selectedAddress?.tag}
          addressLine={addressLine}
          onLogin={() => setSheet('login')}
          onSelectAddress={handleAddressPress}
          onPlaceOrder={handleCheckout}
        />
      </View>

      {/* Variant sheet */}
      <VariantBottomSheet product={vm.variantProduct} onClose={vm.closeVariants} />

      {/* One sheet driven by which purpose opened it. Previously three separate
          instances behind three booleans, which mounted the whole sheet three
          times over and allowed nonsensical combinations of the flags. */}
      <LoginBottomSheet
        visible={sheet !== null}
        onClose={closeSheet}
        onDismiss={finishLoginDismissal}
        {...(sheet === 'checkout'
          ? {
              onComplete: handleLoginComplete,
              onPlaceOrder: handlePlaceOrder,
              initialStep: isAuthenticated ? ('placing' as const) : ('phone' as const),
              itemCount: vm.bill.totalCount,
              grandTotal: Math.round(vm.bill.grandTotal),
            }
          : {
              mode: 'auth' as const,
              // The address gate continues into the address screen; the bottom-CTA
              // login just closes, and the bar advances on its own as
              // isAuthenticated flips.
              onComplete: () => {
                if (sheet === 'address-gate') afterLogin.current = 'address';
                closeSheet();
              },
            })}
      />

      <StoreClosedSheet
        visible={storeNotice !== null}
        status={storeNotice ?? { kind: 'unknown' }}
        timings={getStoreTimings()}
        context="checkout"
        onClose={() => { checkoutAfterNotice.current = false; setStoreNotice(null); }}
        onDismiss={finishStoreNoticeDismissal}
        onPlaceOrder={confirmClosedStoreCheckout}
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
