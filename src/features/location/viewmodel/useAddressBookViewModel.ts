// src/features/location/viewmodel/useAddressBookViewModel.ts
//
// Loads the signed-in user's saved delivery addresses.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/src/core/store';
import { useLocationStore } from '@/src/core/store/useLocationStore';
import { listAddresses, deleteAddress } from '../data/locationApi';
import { useScreenActive } from '@/src/shared/hooks/useScreenActive';

export function useAddressBookViewModel(enabled = true) {
  const screenActive = useScreenActive();
  const active = enabled && screenActive;
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const addresses = useLocationStore((s) => s.savedAddresses);
  const setSavedAddresses = useLocationStore((s) => s.setSavedAddresses);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pending = useRef<AbortController | null>(null);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);

  const refresh = useCallback(async () => {
    if (!isAuthenticated || !active) return;
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    const token = useAuthStore.getState().accessToken;
    setLoading(true);
    setError(null);
    try {
      const next = await listAddresses(controller.signal);
      const auth = useAuthStore.getState();
      if (!controller.signal.aborted && auth.isAuthenticated && auth.accessToken === token) setSavedAddresses(next);
    } catch {
      if (!controller.signal.aborted) setError('failed');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [isAuthenticated, active, setSavedAddresses]);

  useEffect(() => {
    if (!active || !isAuthenticated) setLoading(false);
    void refresh();
    return () => pending.current?.abort();
  }, [refresh, active, isAuthenticated]);

  const remove = useCallback(
    async (id: string) => {
      const token = useAuthStore.getState().accessToken;
      try {
        await deleteAddress(id);
        const auth = useAuthStore.getState();
        if (!auth.isAuthenticated || auth.accessToken !== token) return;
        pending.current?.abort();
        setSavedAddresses(useLocationStore.getState().savedAddresses.filter((a) => a.id !== id));
        if (alive.current) setLoading(false);
      } catch {
        if (alive.current) setError('failed');
      }
    },
    [setSavedAddresses],
  );

  return { isAuthenticated, addresses, loading, error, refresh, remove };
}
