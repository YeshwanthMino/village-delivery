// src/features/home/viewmodel/home/useHomeLayoutViewModel.ts

import { useCallback, useEffect, useState } from 'react';
import { getHomeLayout } from '../../data/homeLayoutApi';
import { HomeSection } from '../../data/homeLayout.types';
import { useStoreId } from '@/src/core/utils/getStoreId';

export function useHomeLayoutViewModel(slug = 'app-home-page-layout') {
  const storeId = useStoreId();

  const [sections, setSections] = useState<HomeSection[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!storeId) return;
    setLoading(true);
    setError(null);
    try {
      const layout = await getHomeLayout(storeId, slug);
      setSections(layout.sections);
    } catch {
      setError('failed');
    } finally {
      setLoading(false);
    }
  }, [storeId, slug]);

  useEffect(() => {
    void load();
  }, [load]);

  return { sections, loading, error, refresh: load, hasStore: !!storeId };
}
