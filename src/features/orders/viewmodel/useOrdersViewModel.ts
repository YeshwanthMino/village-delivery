import { useMemo } from 'react';
import { useOrdersQuery } from '@/src/features/orders/data/queries/useOrdersQuery';

const ACTIVE_STATUSES = new Set(['placed', 'confirmed', 'out_for_delivery']);

export const useOrdersViewModel = () => {
  const { data: orders = [], isLoading, isError } = useOrdersQuery();

  const activeOrders = useMemo(
    () => orders.filter(o => ACTIVE_STATUSES.has(o.status)),
    [orders]
  );

  const pastOrders = useMemo(
    () => orders.filter(o => !ACTIVE_STATUSES.has(o.status)),
    [orders]
  );

  return { allOrders: orders, activeOrders, pastOrders, isLoading, isError };
};
