import { useMemo } from 'react';
import { Order } from '@/src/base/types/village.types';
import { useVillageStore } from '@/src/core/store';

const ACTIVE_STATUSES = new Set(['placed', 'confirmed', 'out_for_delivery']);

export const useOrdersViewModel = () => {
  const orders = useVillageStore(state => state.orders);

  const activeOrders = useMemo(
    () => orders.filter(o => ACTIVE_STATUSES.has(o.status)),
    [orders]
  );

  const pastOrders = useMemo(
    () => orders.filter(o => !ACTIVE_STATUSES.has(o.status)),
    [orders]
  );

  return { activeOrders, pastOrders };
};
