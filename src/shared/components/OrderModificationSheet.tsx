import React, { useEffect, useRef, useState } from 'react';
import { Text, TouchableOpacity, View, ScrollView, Image } from 'react-native';
import { X } from 'lucide-react-native';
import { VillageBottomSheet } from './VillageBottomSheet';
import { CompactStepper } from './CompactStepper';
import { rupees } from '@/src/shared/utils/currency';
import { useTranslation } from '@/src/core/utils/useTranslation';
import { interpolate } from '@/src/base/constants/translations';

export interface StockInfo {
  productId: string;
  availableStock: number;
}

export interface CartItem {
  productId: string;
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

  // The parent builds both `stockInfo` and `cartItems` inline, so their array
  // identities change on every parent render even when nothing about the
  // conflict has. Keying the reset effect on identity therefore wiped the user's
  // in-progress edits whenever anything else on CartScreen re-rendered (stock
  // verification finishing, payment method toggling, auth changing). Depend on
  // the *content* instead, so a reset only happens on genuinely new information.
  const conflictSignature = stockInfo
    .map(c => `${c.productId}:${c.availableStock}`)
    .join('|');
  const cartSignature = cartItems.map(i => `${i.productId}:${i.count}`).join('|');

  useEffect(() => {
    if (!visible) return;

    // Seed each conflicted line at the most the customer can actually have.
    const quantities: Record<string, number> = {};
    for (const conflict of stockInfo) {
      const cartItem = cartItems.find(i => i.productId === conflict.productId);
      if (!cartItem) continue;
      quantities[conflict.productId] = Math.min(conflict.availableStock, cartItem.count);
    }

    setLocalQuantities(quantities);
    setManuallyAdjusted(new Set());
    setIsLoading(false);
    setRetryError(null);
    // stockInfo/cartItems are read above but intentionally excluded: the
    // signatures below capture their content, and depending on the arrays
    // themselves is the bug this effect is guarding against.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, conflictSignature, cartSignature]);

  // Close the sheet once every conflicted line has been zeroed out.
  const onManualAdjustmentRef = useRef(onManualAdjustment);
  const onCloseRef = useRef(onClose);
  onManualAdjustmentRef.current = onManualAdjustment;
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!visible || stockInfo.length === 0) return;

    const allRemoved = stockInfo.every(
      conflict => (localQuantities[conflict.productId] ?? 0) === 0,
    );

    if (allRemoved && manuallyAdjusted.size > 0) {
      onManualAdjustmentRef.current?.(localQuantities);
      onCloseRef.current();
    }
    // Callbacks are read through refs so that a parent re-render passing new
    // inline closures cannot re-trigger the close.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localQuantities, manuallyAdjusted, conflictSignature, visible]);

  const subtotal = cartItems.reduce((sum, cartItem) => {
    const quantity = localQuantities[cartItem.productId] ?? cartItem.count;
    return sum + cartItem.price * quantity;
  }, 0);

  const handleUpdateAllPress = async () => {
    // Adjustments (if any) are applied to the cart first, then checkout is
    // retried either way. On success the parent closes the sheet; on failure the
    // parent hands down fresh conflicts, which re-seeds this sheet.
    if (manuallyAdjusted.size > 0) {
      onManualAdjustment?.(localQuantities);
    }

    setIsLoading(true);
    setRetryError(null);
    try {
      await onRetryCheckout();
    } catch (error) {
      setRetryError((error as Error)?.message || 'Failed to place order. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <VillageBottomSheet visible={visible} onClose={onClose} dismissable={true}>
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
            onPress={onClose}
            className="w-8 h-8 items-center justify-center ml-2"
            testID="close-button-conflicts"
          >
            <X size={20} color="#64748b" />
          </TouchableOpacity>
        </View>

        {/* Item Rows */}
        <ScrollView className="px-4 mt-3 max-h-96" showsVerticalScrollIndicator={false}>
          {stockInfo.map(conflict => {
            const cartItem = cartItems.find(i => i.productId === conflict.productId);
            if (!cartItem) return null;

            const isOutOfStock = conflict.availableStock === 0;
            const currentQuantity = localQuantities[conflict.productId] ?? 0;

            // Hide only items that user manually removed (in manuallyAdjusted AND quantity = 0)
            if (currentQuantity === 0 && manuallyAdjusted.has(conflict.productId)) return null;

            return (
              <View key={conflict.productId} className="pb-4 border-b border-slate-100 last:border-b-0">
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
                    onPress={() => {
                      setManuallyAdjusted(prev => {
                        const updated = new Set(prev);
                        updated.add(conflict.productId);
                        return updated;
                      });
                      setLocalQuantities(prev => ({
                        ...prev,
                        [conflict.productId]: 0,
                      }));
                    }}
                    className="border-2 border-red-600 rounded-lg py-2 items-center"
                  >
                    <Text className="text-red-600 font-semibold">{t('order_mod_remove_item')}</Text>
                  </TouchableOpacity>
                ) : (
                  <View>
                    <View className="flex-row items-center gap-3 mb-2">
                      <CompactStepper
                        count={currentQuantity}
                        testIDSuffix={conflict.productId}
                        onAdd={() => {
                          setManuallyAdjusted(prev => new Set(prev).add(conflict.productId));
                          setLocalQuantities(prev => ({
                            ...prev,
                            [conflict.productId]: Math.min(
                              (prev[conflict.productId] ?? 0) + 1,
                              conflict.availableStock
                            ),
                          }));
                        }}
                        onDec={() => {
                          setManuallyAdjusted(prev => new Set(prev).add(conflict.productId));
                          setLocalQuantities(prev => ({
                            ...prev,
                            [conflict.productId]: Math.max((prev[conflict.productId] ?? 0) - 1, 0),
                          }));
                        }}
                      />
                      <TouchableOpacity
                        onPress={() => {
                          setManuallyAdjusted(prev => new Set(prev).add(conflict.productId));
                          setLocalQuantities(prev => ({ ...prev, [conflict.productId]: 0 }));
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
        </ScrollView>

        {/* Footer */}
        <View className="px-4 mt-4 border-t border-slate-100 pt-4">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-slate-600 text-sm">{t('order_mod_subtotal')}</Text>
            <Text className="text-slate-900 font-bold text-base">{rupees(subtotal)}</Text>
          </View>

          <View className="flex-row gap-3">
            <TouchableOpacity
              onPress={onClose}
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
