import React, { useEffect, useState } from 'react';
import { Text, TouchableOpacity, View, ScrollView } from 'react-native';
import { X } from 'lucide-react-native';
import { VillageBottomSheet } from './VillageBottomSheet';
import { CompactStepper } from './CompactStepper';
import { rupees } from '@/src/features/home/data/static/villageData';

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
  // Track user adjustments: manuallyAdjusted identifies items user changed,
  // localQuantities stores the adjusted values, isLoading/retryError handle retry state,
  // state tracks the sheet view (conflicts vs all-sorted items)
  const [manuallyAdjusted, setManuallyAdjusted] = useState<Set<string>>(new Set());
  const [localQuantities, setLocalQuantities] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);
  const [state, setState] = useState<'conflicts' | 'all-sorted'>('conflicts');

  useEffect(() => {
    if (!visible) return;

    // Build localQuantities based on stockInfo
    const quantities: Record<string, number> = {};
    for (const conflict of stockInfo) {
      const cartItem = cartItems.find(i => i.productId === conflict.productId);
      if (!cartItem) continue;

      if (conflict.availableStock === 0) {
        quantities[conflict.productId] = 0;
      } else if (conflict.availableStock < cartItem.count) {
        quantities[conflict.productId] = conflict.availableStock;
      } else {
        quantities[conflict.productId] = cartItem.count;
      }
    }

    setLocalQuantities(quantities);
    setManuallyAdjusted(new Set());
    setIsLoading(false);
    setRetryError(null);
    setState('conflicts');
  }, [visible, stockInfo, cartItems]);

  const calculateSubtotal = () => {
    return stockInfo.reduce((sum, conflict) => {
      const cartItem = cartItems.find(i => i.productId === conflict.productId);
      if (!cartItem) return sum;
      const quantity = localQuantities[conflict.productId] ?? 0;
      return sum + cartItem.price * quantity;
    }, 0);
  };

  const handleUpdateAllPress = async () => {
    // If no manual adjustments, auto-retry checkout
    if (manuallyAdjusted.size === 0) {
      setIsLoading(true);
      setRetryError(null);
      try {
        await onRetryCheckout();
        // On success, sheet closes automatically via parent
      } catch (error) {
        // On failure with new conflicts, parent updates stockInfo
        // which triggers our useEffect to reinitialize
        setRetryError((error as any)?.message || 'Failed to place order. Please try again.');
      } finally {
        setIsLoading(false);
      }
    } else {
      // User made manual adjustments — close sheet and notify parent
      onManualAdjustment?.(localQuantities);
      onClose();
    }
  };

  return (
    <VillageBottomSheet visible={visible} onClose={onClose} dismissable={true}>
      <View className="pb-6">
        {state === 'conflicts' ? (
          <>
            {/* Header */}
            <View className="flex-row items-center px-4 pb-3 border-b border-slate-100">
              <View className="flex-1">
                <Text className="text-slate-900 font-black text-lg">A couple of things changed</Text>
                <Text className="text-slate-500 text-sm mt-1">
                  Some items in your cart are sold out or running low. Update your order to continue.
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} className="w-8 h-8 items-center justify-center ml-2" testID="close-button-conflicts">
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

                return (
                  <View key={conflict.productId} className="pb-4 border-b border-slate-100 last:border-b-0">
                    {/* Item header with image, name, price */}
                    <View className="flex-row gap-3 mb-2">
                      <View className="w-12 h-12 bg-slate-200 rounded-lg items-center justify-center">
                        <Text className="text-xs text-slate-500">photo</Text>
                      </View>
                      <View className="flex-1">
                        <Text className="text-slate-900 font-semibold text-sm">{cartItem.name}</Text>
                        <Text className="text-slate-500 text-xs mt-0.5">{cartItem.weight}</Text>
                      </View>
                      <Text className="text-slate-900 font-bold text-sm">{rupees(cartItem.price)}</Text>
                    </View>

                    {/* Stock status badge */}
                    {isOutOfStock ? (
                      <Text className="text-red-600 text-sm font-semibold mb-2">Out of stock</Text>
                    ) : (
                      <Text className="text-orange-600 text-sm font-semibold mb-2">
                        Only {conflict.availableStock} left
                      </Text>
                    )}

                    {/* Action: Remove or Adjust */}
                    {isOutOfStock ? (
                      <TouchableOpacity
                        onPress={() => {
                          setManuallyAdjusted(prev => new Set(prev).add(conflict.productId));
                          setLocalQuantities(prev => ({ ...prev, [conflict.productId]: 0 }));
                        }}
                        className="border-2 border-red-600 rounded-lg py-2 items-center"
                      >
                        <Text className="text-red-600 font-semibold">Remove item</Text>
                      </TouchableOpacity>
                    ) : (
                      <View>
                        <View className="flex-row items-center gap-3 mb-2">
                          <CompactStepper
                            count={currentQuantity}
                            onAdd={() => {
                              setManuallyAdjusted(prev => new Set(prev).add(conflict.productId));
                              setLocalQuantities(prev => ({
                                ...prev,
                                [conflict.productId]: Math.min(
                                  prev[conflict.productId] + 1,
                                  conflict.availableStock
                                ),
                              }));
                            }}
                            onDec={() => {
                              setManuallyAdjusted(prev => new Set(prev).add(conflict.productId));
                              setLocalQuantities(prev => ({
                                ...prev,
                                [conflict.productId]: Math.max(prev[conflict.productId] - 1, 0),
                              }));
                            }}
                          />
                          <TouchableOpacity
                            onPress={() => {
                              setManuallyAdjusted(prev => new Set(prev).add(conflict.productId));
                              setLocalQuantities(prev => ({ ...prev, [conflict.productId]: 0 }));
                            }}
                          >
                            <Text className="text-slate-600 text-sm underline">Remove instead</Text>
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
                <Text className="text-slate-600 text-sm">Subtotal</Text>
                <Text className="text-slate-900 font-bold text-base">{rupees(calculateSubtotal())}</Text>
              </View>

              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={onClose}
                  className="flex-1 border-2 border-slate-300 rounded-lg py-3 items-center"
                >
                  <Text className="text-slate-900 font-semibold">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleUpdateAllPress()}
                  disabled={isLoading}
                  className={`flex-1 rounded-lg py-3 items-center ${
                    isLoading ? 'bg-green-400' : 'bg-green-600'
                  }`}
                >
                  <Text className="text-white font-bold">
                    {isLoading ? '...' : 'Update all'}
                  </Text>
                </TouchableOpacity>
              </View>

              {retryError && (
                <Text className="text-red-600 text-xs mt-2 text-center">{retryError}</Text>
              )}
            </View>
          </>
        ) : (
          <>
            {/* Header */}
            <View className="flex-row items-center px-4 pb-3 border-b border-slate-100">
              <View className="flex-1">
                <Text className="text-slate-900 font-black text-lg">All sorted!</Text>
                <Text className="text-slate-500 text-sm mt-1">
                  Your cart is ready — nothing else needs attention.
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} className="w-8 h-8 items-center justify-center ml-2" testID="close-button-sorted">
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Item Rows */}
            <ScrollView className="px-4 mt-3 max-h-96" showsVerticalScrollIndicator={false}>
              {stockInfo.map(conflict => {
                const cartItem = cartItems.find(i => i.productId === conflict.productId);
                if (!cartItem) return null;

                const quantity = localQuantities[conflict.productId] ?? 0;

                return (
                  <View key={conflict.productId} className="pb-4 border-b border-slate-100 last:border-b-0">
                    {/* Item header */}
                    <View className="flex-row gap-3 mb-2">
                      <View className="w-12 h-12 bg-slate-200 rounded-lg items-center justify-center">
                        <Text className="text-xs text-slate-500">photo</Text>
                      </View>
                      <View className="flex-1">
                        <Text className="text-slate-900 font-semibold text-sm">{cartItem.name}</Text>
                        <Text className="text-slate-500 text-xs mt-0.5">{cartItem.weight}</Text>
                      </View>
                      <Text className="text-slate-900 font-bold text-sm">{rupees(cartItem.price)}</Text>
                    </View>

                    {/* Updated badge and quantity */}
                    <View className="flex-row items-center gap-2 mb-2">
                      <Text className="text-green-600 text-sm font-semibold">Updated ✓</Text>
                    </View>

                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center gap-2">
                        <Text className="text-slate-600 text-sm">Qty:</Text>
                        <Text className="text-slate-900 font-semibold">{quantity}</Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </ScrollView>

            {/* Success message */}
            <View className="px-4 mt-3 flex-row items-center gap-2 bg-green-50 border border-green-200 rounded-lg p-3">
              <Text className="text-green-600 text-lg">✓</Text>
              <Text className="text-green-700 text-sm font-medium flex-1">
                All set! Your cart is up to date.
              </Text>
            </View>

            {/* Footer with Place Order button */}
            <View className="px-4 mt-4 border-t border-slate-100 pt-4">
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-slate-600 text-sm">Subtotal</Text>
                <Text className="text-slate-900 font-bold text-base">{rupees(calculateSubtotal())}</Text>
              </View>

              <TouchableOpacity
                onPress={onClose}
                className="w-full bg-green-600 rounded-lg py-3 items-center"
              >
                <Text className="text-white font-bold">Place order · {rupees(calculateSubtotal())}</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </VillageBottomSheet>
  );
};
