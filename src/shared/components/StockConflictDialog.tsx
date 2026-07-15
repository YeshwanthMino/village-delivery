import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
  Image,
} from 'react-native';
import { X } from 'lucide-react-native';
import { useTranslation } from '@/src/core/utils/useTranslation';
import { VillageBottomSheet } from './VillageBottomSheet';

export interface StockConflict {
  productId: string;
  availableStock: number;
}

export interface CartItem {
  productId: string;
  name: string;
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
}

export const StockConflictDialog: React.FC<StockConflictDialogProps> = ({
  visible,
  stockInfo,
  cartItems,
  onUpdateCart,
  onCancel,
}) => {
  const { t } = useTranslation();
  const [state, setState] = useState<DialogState>('showing');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const handleUpdateCart = async () => {
    try {
      setState('updating');
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
    onCancel();
  };

  return (
    <VillageBottomSheet visible={visible} onClose={onCancel}>
      <View className="pb-6">
        {/* Header */}
        <View className="px-4 py-5 flex-row items-start justify-between">
          <View className="flex-1">
            <Text className="text-slate-900 font-black text-xl">
              {t('stock_conflict_title')}
            </Text>
            <Text className="text-slate-500 text-sm mt-2">
              {t('stock_conflict_subtitle')}
            </Text>
          </View>
          <Pressable
            onPress={onCancel}
            className="w-8 h-8 items-center justify-center ml-2"
          >
            <X size={24} color="#64748b" strokeWidth={2} />
          </Pressable>
        </View>

        {/* Divider */}
        <View className="h-px bg-slate-100 my-2" />

        {/* Body */}
        {state === 'showing' && (
          <View className="px-4 py-4 gap-3">
            {stockInfo.map((conflict, idx) => {
              const cartItem = cartItems.find(
                (item) => item.productId === conflict.productId
              );
              if (!cartItem) return null;

              const isRemoval = conflict.availableStock === 0;
              const badgeText = isRemoval
                ? t('stock_conflict_remove_badge')
                : t('stock_conflict_reduce_to').replace(
                    '{n}',
                    String(conflict.availableStock)
                  );
              const badgeColor = isRemoval ? '#dc2626' : '#eab308';

              return (
                <View key={conflict.productId}>
                  <View className="flex-row gap-3 pb-4">
                    {/* Product thumbnail */}
                    <View className="w-20 h-20 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0">
                      {cartItem.image ? (
                        <Image
                          source={{ uri: cartItem.image }}
                          className="w-full h-full"
                          resizeMode="cover"
                        />
                      ) : (
                        <View className="w-full h-full items-center justify-center bg-slate-100">
                          <Text className="text-2xl">📦</Text>
                        </View>
                      )}
                    </View>

                    {/* Product info */}
                    <View className="flex-1">
                      <Text
                        className="text-slate-900 font-bold text-base"
                        numberOfLines={1}
                      >
                        {cartItem.name}
                      </Text>
                      <Text
                        className="text-slate-500 text-sm mt-1"
                        numberOfLines={1}
                      >
                        {t('stock_conflict_quantity_change')
                          .replace('{current}', String(cartItem.count))
                          .replace('{available}', String(conflict.availableStock))}
                      </Text>
                      <View className="flex-row items-center gap-2 mt-2">
                        <View
                          style={{ backgroundColor: badgeColor }}
                          className="px-3 py-1 rounded-full"
                        >
                          <Text className="text-xs font-bold text-white">
                            {badgeText}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                  {idx < stockInfo.length - 1 && (
                    <View className="h-px bg-slate-100" />
                  )}
                </View>
              );
            })}
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
        <View className="px-4 py-4 gap-3 border-t border-slate-100">
          {state === 'showing' && (
            <>
              <Pressable
                onPress={onCancel}
                className="py-4 rounded-2xl border border-slate-300 items-center active:bg-slate-50"
                style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
              >
                <Text className="text-slate-900 font-bold text-base">
                  {t('stock_conflict_cancel_button')}
                </Text>
              </Pressable>
              <Pressable
                onPress={handleUpdateCart}
                className="py-4 rounded-2xl bg-green-600 items-center active:bg-green-700"
                style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
              >
                <Text className="text-white font-bold text-base">
                  {t('stock_conflict_update_button')}
                </Text>
              </Pressable>
            </>
          )}

          {state === 'error' && (
            <>
              <Pressable
                onPress={handleBackToCart}
                className="py-4 rounded-2xl border border-slate-300 items-center active:bg-slate-50"
                style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
              >
                <Text className="text-slate-900 font-bold text-base">
                  {t('stock_conflict_back_to_cart')}
                </Text>
              </Pressable>
              <Pressable
                onPress={handleRetry}
                className="py-4 rounded-2xl bg-green-600 items-center active:bg-green-700"
                style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
              >
                <Text className="text-white font-bold text-base">
                  {t('stock_conflict_try_again')}
                </Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
    </VillageBottomSheet>
  );
};
