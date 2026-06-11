// src/features/home/viewmodel/home/useHomeLayoutViewModel.ts

import { useCallback, useEffect, useState } from 'react';
import { useLocationStore } from '@/src/core/store/useLocationStore';
import { useVillageStore } from '@/src/core/store/useVillageStore';
import { getHomeLayout } from '../../data/homeLayoutApi';
import { HomeSection } from '../../data/homeLayout.types';

export function useHomeLayoutViewModel() {
  const storeId = useLocationStore((s) => s.serviceableVillage?.storeId);
  const registerDynamicPrices = useVillageStore((s) => s.registerDynamicPrices);

  const [sections, setSections] = useState<HomeSection[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!storeId) return;
    setLoading(true);
    setError(null);
    try {
      const layout = await getHomeLayout(storeId);
      setSections(layout.sections);
      // Register real prices so cart totals resolve dynamic products.
      const prices: Record<string, number> = {};
      for (const section of layout.sections) {
        if (section.kind === 'productCarousel') {
          for (const p of section.products) prices[p.id] = p.price;
        }
      }
      if (Object.keys(prices).length) registerDynamicPrices(prices);
    } catch {
      setError('failed');
    } finally {
      setLoading(false);
    }
  }, [storeId, registerDynamicPrices]);

  useEffect(() => {
    void load();
  }, [load]);

  return { sections, loading, error, refresh: load, hasStore: !!storeId };
}
