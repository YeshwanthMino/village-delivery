// src/features/home/viewmodel/home/useHomeLayoutViewModel.ts

import { useCallback, useEffect, useRef, useState } from 'react';
import { getHomeLayout } from '../../data/homeLayoutApi';
import { HomeSection } from '../../data/homeLayout.types';
import { useStoreId } from '@/src/core/utils/getStoreId';
import { useLocationStore } from '@/src/core/store/useLocationStore';
import { useScreenActive } from '@/src/shared/hooks/useScreenActive';

export function useHomeLayoutViewModel(slug = 'app-home-page-layout') {
  const storeId = useStoreId();
  const active = useScreenActive();
  // Reload the layout when the customer moves to another branch.
  const branchId = useLocationStore(
    (s) => s.serviceableVillage?.branchId ?? '',
  );

  const [sections, setSections] = useState<HomeSection[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pending = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    if (!storeId || !active) return;
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    setLoading(true);
    setError(null);
    try {
      const layout = await getHomeLayout(storeId, slug, controller.signal);
      if (!controller.signal.aborted) setSections(layout.sections);
    } catch {
      if (!controller.signal.aborted) setError('failed');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [storeId, slug, active]);

  useEffect(() => {
    setSections([]);
    setError(null);
  }, [storeId, branchId, slug]);

  useEffect(() => {
    if (!active || !storeId) setLoading(false);
    void load();
    return () => pending.current?.abort();
    // A branch change must replace even an otherwise identical store/slug fetch.
  }, [load, active, storeId, branchId]);

  return { sections, loading, error, refresh: load, hasStore: !!storeId };
}
