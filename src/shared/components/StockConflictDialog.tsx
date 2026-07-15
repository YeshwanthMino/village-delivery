import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
  Image,
} from 'react-native';
import { X, Minus, Plus } from 'lucide-react-native';
import { useTranslation } from '@/src/core/utils/useTranslation';
import { VillageBottomSheet } from './VillageBottomSheet';
import { rupees } from '@/src/features/home/data/static/villageData';

export interface StockConflict {
  productId: string;
  availableStock: number;
}

export interface CartItem {
  productId: string;
  name: string;
  weight?: string;
  price: number;
  image?: string;
  count: number;
}

type DialogState = 'showing' | 'updating' | 'retrying' | 'error';

interface StockConflictDialogProps {
  visible: boolean;
  stockInfo: StockConflict[];
  cartItems: CartItem[];
  onUpdateCart: () => Promise<void>;
  onCancel: () => void;
  onQtyChange?: (productId: string, newQty: number) => void;
  onRemove?: (productId: string) => void;
}

export const StockConflictDialog: React.FC<StockConflictDialogProps> = ({
  visible,
  stockInfo,
  cartItems,
  onUpdateCart,
  onCancel,
  onQtyChange,
  onRemove,
}) => {
  const { t } = useTranslation();
  const [state, setState] = useState<DialogState>('showing');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [localQtyChanges, setLocalQtyChanges] = useState<Record<string, number>>({});

  const affectedItems = useMemo(() => {
    return stockInfo.map(conflict => {
      const cartItem = cartItems.find(i => i.productId === conflict.productId);
      return { conflict, cartItem };
    }).filter(({ cartItem }) => cartItem);
  }, [stockInfo, cartItems]);

  const subtotal = useMemo(() => {
    return affectedItems.reduce((sum, { cartItem, conflict }) => {
      if (!cartItem) return sum;
      const qty = localQtyChanges[cartItem.productId] ?? cartItem.count;
      return sum + (cartItem.price * qty);
    }, 0);
  }, [affectedItems, localQtyChanges]);

  const handleQtyDecrement = (productId: string) => {
    setLocalQtyChanges(prev => ({
      ...prev,
      [productId]: Math.max(0, (prev[productId] ?? cartItems.find(i => i.productId === productId)?.count ?? 0) - 1)
    }));
  };

  const handleQtyIncrement = (productId: string, maxStock: number) => {
    setLocalQtyChanges(prev => ({
      ...prev,
      [productId]: Math.min(maxStock, (prev[productId] ?? cartItems.find(i => i.productId === productId)?.count ?? 0) + 1)
    }));
  };

  const handleUpdateCart = async () => {
    try {
      setState('updating');

      // Apply quantity changes before calling onUpdateCart
      for (const [productId, newQty] of Object.entries(localQtyChanges)) {
        const cartItem = cartItems.find(i => i.productId === productId);
        if (cartItem && newQty !== cartItem.count) {
          onQtyChange?.(productId, newQty);
        }
      }

      await onUpdateCart();
    } catch (error) {
      setState('error');
      setErrorMessage(
        error instanceof Error ? error.message : t('stock_conflict_error')
      );
    }
  };

  const handleRetry = async () => {
    await handleUpdateCart();
  };

  const handleBackToCart = () => {
    setState('showing');
    setErrorMessage('');
    setLocalQtyChanges({});
    onCancel();
  };

  return (
    <VillageBottomSheet visible={visible} onClose={onCancel}>
      <View className="pb-6">
        {/* Header */}
        <View className="px-4 py-5 flex-row items-start justify-between border-b border-slate-100">
          <View className="flex-1 pr-3">
            <Text className="text-slate-900 font-black text-xl">
              {t('stock_conflict_title')}
            </Text>
            <Text className="text-slate-500 text-sm mt-2 leading-5">
              {t('stock_conflict_subtitle')}
            </Text>
          </View>
          <Pressable
            onPress={onCancel}
            className="w-8 h-8 items-center justify-center flex-shrink-0"
          >
            <X size={24} color="#64748b" strokeWidth={2} />
          </Pressable>
        </View>

        {/* Body */}
        {state === 'showing' && (
          <View className="px-4 py-4">
            <View className="gap-3">
              {affectedItems.map(({ conflict, cartItem }) => {
                if (!cartItem) return null;

                const isOutOfStock = conflict.availableStock === 0;
                const currentQty = localQtyChanges[cartItem.productId] ?? cartItem.count;
                const statusText = isOutOfStock
                  ? t('stock_conflict_remove_badge')
                  : t('stock_conflict_reduce_to').replace('{n}', String(conflict.availableStock));
                const statusColor = isOutOfStock ? '#ef4444' : '#f59e0b';

                return (
                  <View
                    key={cartItem.productId}
                    className="border border-slate-200 rounded-2xl p-4 bg-white gap-3"
                  >
                    {/* Product header with image, name, price */}
                    <View className="flex-row gap-3">
                      {/* Image */}
                      <View className="w-16 h-16 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0">
                        {cartItem.image ? (
                          <Image
                            source={{ uri: cartItem.image }}
                            className="w-full h-full"
                            resizeMode="cover"
                          />
                        ) : (
                          <View className="w-full h-full items-center justify-center bg-slate-200">
                            <Text className="text-xs text-slate-400">photo</Text>
                          </View>
                        )}
                      </View>

                      {/* Info */}
                      <View className="flex-1">
                        <View className="flex-row items-start justify-between gap-2">
                          <View className="flex-1">
                            <Text className="text-slate-900 font-bold text-base leading-5">
                              {cartItem.name}
                            </Text>
                            {cartItem.weight && (
                              <Text className="text-slate-500 text-xs mt-1">
                                {cartItem.weight}
                              </Text>
                            )}
                          </View>
                          <Text className="text-slate-900 font-bold text-base flex-shrink-0">
                            ₹{rupees(cartItem.price)}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Status badge */}
                    <View>
                      <Text style={{ color: statusColor }} className="text-sm font-bold">
                        {statusText}
                      </Text>
                    </View>

                    {/* Action */}
                    {isOutOfStock ? (
                      <Pressable
                        onPress={() => {
                          setLocalQtyChanges(prev => ({
                            ...prev,
                            [cartItem.productId]: 0
                          }));
                          onRemove?.(cartItem.productId);
                        }}
                        className="py-3 border border-orange-500 rounded-xl items-center"
                      >
                        <Text className="text-orange-600 font-bold text-base">
                          Remove item
                        </Text>
                      </Pressable>
                    ) : (
                      <View className="gap-3">
                        <View className="flex-row items-center gap-4">
                          <View className="flex-row items-center border border-slate-300 rounded-xl px-3 py-2 gap-2">
                            <Pressable
                              onPress={() => handleQtyDecrement(cartItem.productId)}
                              className="w-6 h-6 items-center justify-center"
                            >
                              <Minus size={16} color="#64748b" />
                            </Pressable>
                            <Text className="text-slate-900 font-bold text-base w-8 text-center">
                              {currentQty}
                            </Text>
                            <Pressable
                              onPress={() => handleQtyIncrement(cartItem.productId, conflict.availableStock)}
                              className="w-6 h-6 items-center justify-center"
                            >
                              <Plus size={16} color="#64748b" />
                            </Pressable>
                          </View>
                        </View>
                        <Pressable
                          onPress={() => {
                            setLocalQtyChanges(prev => ({
                              ...prev,
                              [cartItem.productId]: 0
                            }));
                            onRemove?.(cartItem.productId);
                          }}
                        >
                          <Text className="text-slate-600 font-semibold text-sm underline">
                            Remove instead
                          </Text>
                        </Pressable>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>

            {/* Subtotal */}
            <View className="flex-row justify-between items-center py-4 border-t border-slate-100 mt-4">
              <Text className="text-slate-600 text-base">Subtotal</Text>
              <Text className="text-slate-900 font-bold text-base">
                ₹{rupees(subtotal)}
              </Text>
            </View>
          </View>
        )}

        {state === 'updating' && (
          <View className="px-4 py-12 items-center justify-center">
            <ActivityIndicator size="large" color="#16a34a" />
            <Text className="text-slate-600 text-sm mt-3">
              {t('stock_conflict_updating')}
            </Text>
          </View>
        )}

        {state === 'retrying' && (
          <View className="px-4 py-12 items-center justify-center">
            <ActivityIndicator size="large" color="#16a34a" />
            <Text className="text-slate-600 text-sm mt-3">
              {t('stock_conflict_retrying')}
            </Text>
          </View>
        )}

        {state === 'error' && (
          <View className="px-4 py-8 items-center justify-center">
            <View className="w-14 h-14 rounded-full bg-red-100 items-center justify-center mb-4">
              <Text className="text-2xl">⚠️</Text>
            </View>
            <Text className="text-slate-900 font-semibold text-base text-center">
              {errorMessage}
            </Text>
          </View>
        )}

        {/* Footer with buttons */}
        <View className="px-4 py-4 gap-3 border-t border-slate-100 flex-row">
          {state === 'showing' && (
            <>
              <Pressable
                onPress={onCancel}
                className="flex-1 py-4 rounded-2xl border border-slate-300 items-center"
                style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
              >
                <Text className="text-slate-900 font-bold text-base">
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={handleUpdateCart}
                className="flex-1 py-4 rounded-2xl bg-green-600 items-center"
                style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
              >
                <Text className="text-white font-bold text-base">
                  Update all
                </Text>
              </Pressable>
            </>
          )}

          {state === 'error' && (
            <>
              <Pressable
                onPress={handleBackToCart}
                className="flex-1 py-4 rounded-2xl border border-slate-300 items-center"
                style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
              >
                <Text className="text-slate-900 font-bold text-base">
                  Back to cart
                </Text>
              </Pressable>
              <Pressable
                onPress={handleRetry}
                className="flex-1 py-4 rounded-2xl bg-green-600 items-center"
                style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
              >
                <Text className="text-white font-bold text-base">
                  Try again
                </Text>
              </Pressable>
            </>
          )}

          {(state === 'updating' || state === 'retrying') && (
            <>
              <Pressable
                disabled
                className="flex-1 py-4 rounded-2xl border border-slate-300 items-center opacity-50"
              >
                <Text className="text-slate-900 font-bold text-base">
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                disabled
                className="flex-1 py-4 rounded-2xl bg-green-600 items-center opacity-50 flex-row items-center justify-center gap-2"
              >
                <ActivityIndicator size="small" color="#ffffff" />
                <Text className="text-white font-bold text-base">
                  {state === 'updating' ? 'Updating...' : 'Retrying...'}
                </Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
    </VillageBottomSheet>
  );
};
