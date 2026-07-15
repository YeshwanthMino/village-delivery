import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
  Image,
} from 'react-native';
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
        <View className="px-4 py-4 border-b border-slate-200">
          <Text className="text-slate-900 font-bold text-lg">
            {t('stock_conflict_title')}
          </Text>
          <Text className="text-slate-500 text-sm mt-1">
            {t('stock_conflict_subtitle')}
          </Text>
        </View>

        {/* Body */}
        {state === 'showing' && (
          <View className="px-4 py-4">
            {stockInfo.map((conflict) => {
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
                <View
                  key={conflict.productId}
                  className="flex-row gap-3 mb-4 pb-4 border-b border-slate-100 last:border-b-0 last:mb-0 last:pb-0"
                >
                  {/* Product thumbnail */}
                  <View className="w-16 h-16 rounded-lg overflow-hidden bg-slate-100">
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
                      className="text-slate-900 font-semibold text-sm"
                      numberOfLines={2}
                    >
                      {cartItem.name}
                    </Text>
                    <View className="flex-row items-center gap-2 mt-2">
                      <View
                        style={{ backgroundColor: badgeColor }}
                        className="px-2.5 py-1 rounded-full"
                      >
                        <Text className="text-xs font-bold text-slate-900">
                          {badgeText}
                        </Text>
                      </View>
                    </View>
                    <Text className="text-slate-400 text-xs mt-1">
                      {t('stock_conflict_quantity_change')
                        .replace('{current}', String(cartItem.count))
                        .replace('{available}', String(conflict.availableStock))}
                    </Text>
                  </View>
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
            <View className="w-16 h-16 rounded-full bg-red-100 items-center justify-center mb-3">
              <Text className="text-2xl">⚠️</Text>
            </View>
            <Text className="text-slate-900 font-semibold text-center">
              {errorMessage}
            </Text>
          </View>
        )}

        {/* Footer with buttons */}
        <View className="px-4 py-4 border-t border-slate-100 flex-row gap-3">
          {state === 'showing' && (
            <>
              <Pressable
                onPress={onCancel}
                className="flex-1 py-3 rounded-lg border border-slate-200 items-center"
                style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
              >
                <Text className="text-slate-600 font-semibold text-sm">
                  {t('stock_conflict_cancel_button')}
                </Text>
              </Pressable>
              <Pressable
                onPress={handleUpdateCart}
                className="flex-1 py-3 rounded-lg bg-green-600 items-center"
                style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
              >
                <Text className="text-white font-semibold text-sm">
                  {t('stock_conflict_update_button')}
                </Text>
              </Pressable>
            </>
          )}

          {state === 'error' && (
            <>
              <Pressable
                onPress={handleBackToCart}
                className="flex-1 py-3 rounded-lg border border-slate-200 items-center"
                style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
              >
                <Text className="text-slate-600 font-semibold text-sm">
                  {t('stock_conflict_back_to_cart')}
                </Text>
              </Pressable>
              <Pressable
                onPress={handleRetry}
                className="flex-1 py-3 rounded-lg bg-green-600 items-center"
                style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
              >
                <Text className="text-white font-semibold text-sm">
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
