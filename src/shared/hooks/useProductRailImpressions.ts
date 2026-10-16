import { useCallback, useEffect, useRef } from 'react';
import { Dimensions, View, type ViewToken } from 'react-native';
import { analytics } from '@/src/base/services/analytics';
import { useScreenFocused } from './useScreenActive';

interface ProductWithId { id: string }

export function useProductRailImpressions<T extends ProductWithId>(
  listId: string,
  source: string,
  registerCheck?: (check: () => void) => () => void,
  recommendationId?: string,
  modelVersion?: string,
) {
  const railRef = useRef<View>(null);
  const horizontalItems = useRef<Array<{ productId: string; position: number }>>([]);
  const previousListId = useRef(listId);
  if (previousListId.current !== listId) {
    previousListId.current = listId;
    horizontalItems.current = [];
  }
  const seen = useRef(new Set<string>());
  const focused = useScreenFocused();
  const values = useRef({ listId, source, focused, recommendationId, modelVersion });
  values.current = { listId, source, focused, recommendationId, modelVersion };
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50, minimumViewTime: 250 }).current;

  const checkVisible = useCallback(() => {
    const { listId: id, source: origin, focused: active, recommendationId: recId, modelVersion: version } = values.current;
    if (!active || !id || horizontalItems.current.length === 0) return;
    railRef.current?.measureInWindow((_x, y, _width, height) => {
      const screenHeight = Dimensions.get('window').height;
      if (height <= 0 || Math.min(y + height, screenHeight) - Math.max(y, 0) < height * 0.5) return;
      for (const { productId, position } of horizontalItems.current) {
        const key = `${id}:${position}:${productId}`;
        if (seen.current.has(key)) continue;
        seen.current.add(key);
        analytics.track('product_impression', {
          product_id: productId, list_id: id, source: origin, position,
          ...(recId ? { recommendation_id: recId } : {}),
          ...(version ? { model_version: version } : {}),
        });
      }
    });
  }, []);

  useEffect(() => registerCheck?.(checkVisible), [registerCheck, checkVisible]);
  useEffect(() => { if (focused) checkVisible(); }, [focused, checkVisible]);

  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken<T>[] }) => {
    horizontalItems.current = viewableItems
      .filter(token => token.isViewable && token.item?.id && token.index != null)
      .map(token => ({ productId: token.item.id, position: token.index! + 1 }));
    checkVisible();
  }, [checkVisible]);

  return { railRef, onViewableItemsChanged, viewabilityConfig, checkVisible };
}
