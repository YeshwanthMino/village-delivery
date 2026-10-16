import { useCallback, useEffect, useRef } from 'react';
import type { ViewToken } from 'react-native';
import { analytics } from '@/src/base/services/analytics';
import { useScreenFocused } from './useScreenActive';

interface ProductWithId { id: string }

/** FlatList's actual viewport, rather than the complete API response. */
export function useProductListImpressions<T extends ProductWithId>(listId: string, source: string) {
  const focused = useScreenFocused();
  const current = useRef({ listId, source, focused });
  current.current = { listId, source, focused };
  const seen = useRef(new Set<string>());
  const lastViewable = useRef<ViewToken<T>[]>([]);
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50, minimumViewTime: 250 }).current;

  const recordVisible = useCallback(() => {
    const { listId: id, source: origin, focused: active } = current.current;
    if (!active || !id) return;
    for (const token of lastViewable.current) {
      if (!token.isViewable || !token.item?.id || token.index == null) continue;
      const position = token.index + 1;
      const key = `${id}:${position}:${token.item.id}`;
      if (seen.current.has(key)) continue;
      seen.current.add(key);
      analytics.track('product_impression', {
        product_id: token.item.id,
        list_id: id,
        source: origin,
        position,
      });
    }
  }, []);
  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken<T>[] }) => {
    lastViewable.current = viewableItems;
    recordVisible();
  }, [recordVisible]);

  useEffect(() => { recordVisible(); }, [focused, listId, source, recordVisible]);

  return { onViewableItemsChanged, viewabilityConfig };
}
