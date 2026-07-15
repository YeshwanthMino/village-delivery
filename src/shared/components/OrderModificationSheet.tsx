import React, { useEffect, useState } from 'react';
import { Text, TouchableOpacity, View, ScrollView } from 'react-native';
import { X } from 'lucide-react-native';
import { VillageBottomSheet } from './VillageBottomSheet';
import { CompactStepper } from './CompactStepper';

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

  return (
    <VillageBottomSheet visible={visible} onClose={onClose}>
      <View className="pb-6">
        {/* Placeholder — implement in next tasks */}
        <Text>Order Modification Sheet</Text>
      </View>
    </VillageBottomSheet>
  );
};
