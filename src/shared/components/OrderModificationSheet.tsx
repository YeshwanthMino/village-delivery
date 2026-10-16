import React, { useEffect, useRef, useState } from 'react';
import { Text, TouchableOpacity, View, Image } from 'react-native';
import { X } from 'lucide-react-native';
import { VillageBottomSheet } from './VillageBottomSheet';
import { CompactStepper } from './CompactStepper';
import { rupees } from '@/src/shared/utils/currency';
import { useTranslation } from '@/src/core/utils/useTranslation';
import { interpolate } from '@/src/base/constants/translations';

export interface StockInfo {
  productId: string;
  variantId?: string;
  availableStock: number;
}

export interface CartItem {
  key?: string;
  productId: string;
  variantId?: string;
  name: string;
  weight: string;
  price: number;
  image: string;
  count: number;
}

export interface OrderModificationSheetProps {
  visible: boolean;
  stockInfo: StockInfo[];
  cartItems: CartItem[];
  onClose: () => void;
  onRetryCheckout: () => Promise<void>;
  onManualAdjustment?: (adjustedQuantities: Record<string, number>) => void;
}

const lineKey = (item: CartItem) => item.key ?? (item.variantId ? `${item.productId}:${item.variantId}` : item.productId);

const findConflictedItem = (conflict: StockInfo, items: CartItem[]) =>
  conflict.variantId
    ? items.find(item => item.productId === conflict.productId && item.variantId === conflict.variantId)
    : items.find(item => item.productId === conflict.productId && !item.variantId)
      ?? items.find(item => item.productId === conflict.productId);

export const OrderModificationSheet: React.FC<OrderModificationSheetProps> = ({
  visible,
  stockInfo,
  cartItems,
  onClose,
  onRetryCheckout,
  onManualAdjustment,
}) => {
  const { t } = useTranslation();
  // manuallyAdjusted identifies the lines the customer changed, localQuantities
  // holds the values, isLoading/retryError cover the retry round-trip.
  const [manuallyAdjusted, setManuallyAdjusted] = useState<Set<string>>(new Set());
  const [localQuantities, setLocalQuantities] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);
  const retrying = useRef(false);
  const session = useRef(0);

  // A previous checkout may settle after this sheet was dismissed and reopened.
  // Its completion must not unlock or change the new sheet's state.
  useEffect(() => {
    if (!visible) {
      session.current += 1;
      retrying.current = false;
    }
  }, [visible]);
  useEffect(() => () => { session.current += 1; }, []);

  // The parent builds both `stockInfo` and `cartItems` inline, so their array
  // identities change on every parent render even when nothing about the
  // conflict has. Keying the reset effect on identity therefore wiped the user's
  // in-progress edits whenever anything else on CartScreen re-rendered (stock
  // verification finishing, payment method toggling, auth changing). Depend on
  // the *content* instead, so a reset only happens on genuinely new information.
  const conflictSignature = stockInfo
    .map(c => `${c.productId}:${c.variantId ?? ''}:${c.availableStock}`)
    .join('|');
  useEffect(() => {
    if (!visible) return;

    // Seed each conflicted line at the most the customer can actually have.
    const quantities: Record<string, number> = {};
    for (const conflict of stockInfo) {
      const cartItem = findConflictedItem(conflict, cartItems);
      if (!cartItem) continue;
      quantities[lineKey(cartItem)] = Math.min(conflict.availableStock, cartItem.count);
    }

    setLocalQuantities(quantities);
    setManuallyAdjusted(new Set());
    // Applying the capped quantities changes the cart while a retry is in
    // flight. A new server conflict can refresh the rows, but cannot unlock
    // backdrop/Back/Cancel until that request actually finishes.
    if (!retrying.current) setIsLoading(false);
    setRetryError(null);
    // These arrays are read above but intentionally excluded: depending on
    // their identities resets a customer's edits on unrelated cart renders.
    // A new conflict or a new presentation does need fresh quantities.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, conflictSignature]);

  // Close the sheet once every conflicted line has been zeroed out.
  const onManualAdjustmentRef = useRef(onManualAdjustment);
  const onCloseRef = useRef(onClose);
  onManualAdjustmentRef.current = onManualAdjustment;
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!visible || stockInfo.length === 0) return;

    const allRemoved = stockInfo.every(
      conflict => {
        const cartItem = findConflictedItem(conflict, cartItems);
        return !cartItem || (localQuantities[lineKey(cartItem)] ?? 0) === 0;
      },
    );

    if (allRemoved && manuallyAdjusted.size > 0 && !retrying.current) {
      onManualAdjustmentRef.current?.(localQuantities);
      onCloseRef.current();
    }
    // Callbacks are read through refs so that a parent re-render passing new
    // inline closures cannot re-trigger the close.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localQuantities, manuallyAdjusted, conflictSignature, visible]);

  const subtotal = cartItems.reduce((sum, cartItem) => {
    const quantity = localQuantities[lineKey(cartItem)] ?? cartItem.count;
    return sum + cartItem.price * quantity;
  }, 0);

  const handleUpdateAllPress = async () => {
    if (retrying.current) return;
    // If the adjustment removes every line there is no order left to place.
    // The cart changes synchronously, so a retry here would race the empty
    // cart view and potentially submit the old contents.
    const remainingCount = cartItems.reduce(
      (total, item) => total + (localQuantities[lineKey(item)] ?? item.count),
      0,
    );
    if (remainingCount === 0) {
      onManualAdjustment?.(localQuantities);
      onClose();
      return;
    }
    // localQuantities is always seeded to what the customer can actually have
    // (Math.min(availableStock, cartItem.count) — see the reset effect above),
    // for every conflicted line, whether or not they touched a control. Apply
    // it unconditionally so a shortfall the customer never adjusted by hand
    // (the stepper already showed the capped count) is still written back to
    // the real cart — otherwise retrying resubmits the original, too-high
    // quantity. Checkout is then retried either way: on success the parent
    // closes the sheet; on failure it hands down fresh conflicts, which
    // re-seeds this one.
    retrying.current = true;
    const retrySession = session.current;
    setIsLoading(true);
    setRetryError(null);
    try {
      onManualAdjustment?.(localQuantities);
      await onRetryCheckout();
    } catch (error) {
      if (session.current === retrySession) {
        setRetryError((error as Error)?.message || 'Failed to place order. Please try again.');
      }
    } finally {
      if (session.current === retrySession) {
        retrying.current = false;
        setIsLoading(false);
      }
    }
  };

  const requestClose = () => {
    if (!retrying.current) onClose();
  };

  return (
    <VillageBottomSheet visible={visible} onClose={requestClose} dismissable={!isLoading}>
      <View className="pb-6">
        {/* Header */}
        <View className="flex-row items-center px-4 pb-3 border-b border-slate-100">
          <View className="flex-1">
            <Text className="text-slate-900 font-black text-lg">{t('order_mod_title')}</Text>
            <Text className="text-slate-500 text-sm mt-1">
              {t('order_mod_subtitle')}
            </Text>
          </View>
          <TouchableOpacity
            onPress={requestClose}
            disabled={isLoading}
            className="w-8 h-8 items-center justify-center ml-2"
            testID="close-button-conflicts"
          >
            <X size={20} color="#64748b" />
          </TouchableOpacity>
        </View>

        {/* Item Rows */}
        <View className="px-4 mt-3">
          {stockInfo.map(conflict => {
            const cartItem = findConflictedItem(conflict, cartItems);
            if (!cartItem) return null;

            const key = lineKey(cartItem);
            const isOutOfStock = conflict.availableStock === 0;
            const currentQuantity = localQuantities[key] ?? 0;

            // Hide only items that user manually removed (in manuallyAdjusted AND quantity = 0)
            if (currentQuantity === 0 && manuallyAdjusted.has(key)) return null;

            return (
              <View key={key} className="pb-4 border-b border-slate-100 last:border-b-0">
                {/* Item header with image, name, price */}
                <View className="flex-row gap-3 mb-2">
                  <View className="w-12 h-12 rounded-lg overflow-hidden bg-slate-200">
                    {cartItem.image ? (
                      <Image
                        source={{ uri: cartItem.image }}
                        style={{ width: '100%', height: '100%' }}
                      />
                    ) : (
                      <View className="flex-1 items-center justify-center">
                        <Text className="text-xs text-slate-500">{t('order_mod_photo')}</Text>
                      </View>
                    )}
                  </View>
                  <View className="flex-1">
                    <Text className="text-slate-900 font-semibold text-sm">{cartItem.name}</Text>
                    {/* Show weight/unit if available, otherwise show stock status */}
                    {cartItem.weight ? (
                      <Text className="text-slate-500 text-xs mt-0.5">{cartItem.weight}</Text>
                    ) : (
                      isOutOfStock ? (
                        <View className="bg-red-50 px-2 py-1 rounded-full self-start mt-0.5">
                          <Text className="text-red-600 text-xs font-semibold">{t('out_of_stock')}</Text>
                        </View>
                      ) : (
                        <View className="bg-amber-50 px-2 py-1 rounded-full self-start mt-0.5">
                          <Text className="text-amber-600 text-xs font-semibold">
                            {interpolate(t('order_mod_only_left'), conflict.availableStock)}
                          </Text>
                        </View>
                      )
                    )}
                  </View>
                  <Text className="text-slate-900 font-bold text-sm">{rupees(cartItem.price)}</Text>
                </View>

                {/* Only show stock status here if weight was already shown */}
                {cartItem.weight && (
                  isOutOfStock ? (
                    <View className="bg-red-50 px-3 py-2 rounded-full self-start mb-2">
                      <Text className="text-red-600 text-sm font-semibold">{t('out_of_stock')}</Text>
                    </View>
                  ) : (
                    <View className="bg-amber-50 px-3 py-2 rounded-full self-start mb-2">
                      <Text className="text-amber-600 text-sm font-semibold">
                        {interpolate(t('order_mod_only_left'), conflict.availableStock)}
                      </Text>
                    </View>
                  )
                )}

                {/* Action: Remove or Adjust */}
                {isOutOfStock ? (
                  <TouchableOpacity
                    disabled={isLoading}
                    onPress={() => {
                      if (retrying.current) return;
                      setManuallyAdjusted(prev => {
                        const updated = new Set(prev);
                        updated.add(key);
                        return updated;
                      });
                      setLocalQuantities(prev => ({
                        ...prev,
                        [key]: 0,
                      }));
                    }}
                    className="border-2 border-red-600 rounded-lg py-2 items-center"
                  >
                    <Text className="text-red-600 font-semibold">{t('order_mod_remove_item')}</Text>
                  </TouchableOpacity>
                ) : (
                  <View pointerEvents={isLoading ? 'none' : 'auto'} style={{ opacity: isLoading ? 0.5 : 1 }}>
                    <View className="flex-row items-center gap-3 mb-2">
                      <CompactStepper
                        count={currentQuantity}
                        testIDSuffix={key}
                        onAdd={() => {
                          if (retrying.current) return;
                          setManuallyAdjusted(prev => new Set(prev).add(key));
                          setLocalQuantities(prev => ({
                            ...prev,
                            [key]: Math.min(
                              (prev[key] ?? 0) + 1,
                              conflict.availableStock
                            ),
                          }));
                        }}
                        onDec={() => {
                          if (retrying.current) return;
                          setManuallyAdjusted(prev => new Set(prev).add(key));
                          setLocalQuantities(prev => ({
                            ...prev,
                            [key]: Math.max((prev[key] ?? 0) - 1, 0),
                          }));
                        }}
                      />
                      <TouchableOpacity
                        onPress={() => {
                          if (retrying.current) return;
                          setManuallyAdjusted(prev => new Set(prev).add(key));
                          setLocalQuantities(prev => ({ ...prev, [key]: 0 }));
                        }}
                      >
                        <Text className="text-slate-600 text-sm underline">{t('order_mod_remove_instead')}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Footer */}
        <View className="px-4 mt-4 border-t border-slate-100 pt-4">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-slate-600 text-sm">{t('order_mod_subtotal')}</Text>
            <Text className="text-slate-900 font-bold text-base">{rupees(subtotal)}</Text>
          </View>

          <View className="flex-row gap-3">
            <TouchableOpacity
              onPress={requestClose}
              disabled={isLoading}
              className="flex-1 border-2 border-slate-300 rounded-lg py-3 items-center"
            >
              <Text className="text-slate-900 font-semibold">{t('cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleUpdateAllPress()}
              disabled={isLoading}
              className={`flex-1 rounded-lg py-3 items-center ${
                isLoading ? 'bg-green-400' : 'bg-green-600'
              }`}
            >
              <Text className="text-white font-bold">
                {isLoading ? '...' : t('order_mod_update_all')}
              </Text>
            </TouchableOpacity>
          </View>

          {retryError && (
            <Text className="text-red-600 text-xs mt-2 text-center">{retryError}</Text>
          )}
        </View>
      </View>
    </VillageBottomSheet>
  );
};
