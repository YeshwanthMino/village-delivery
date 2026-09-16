// src/features/location/viewmodel/useAddressBookViewModel.ts
//
// Loads the signed-in user's saved delivery addresses.

import { useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '@/src/core/store';
import { useLocationStore } from '@/src/core/store/useLocationStore';
import { listAddresses, deleteAddress } from '../data/locationApi';

export function useAddressBookViewModel() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const addresses = useLocationStore((s) => s.savedAddresses);
  const setSavedAddresses = useLocationStore((s) => s.setSavedAddresses);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError(null);
    try {
      setSavedAddresses(await listAddresses());
    } catch {
      setError('failed');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, setSavedAddresses]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const remove = useCallback(
    async (id: string) => {
      try {
        await deleteAddress(id);
        setSavedAddresses(addresses.filter((a) => a.id !== id));
      } catch {
        setError('failed');
      }
    },
    [addresses, setSavedAddresses],
  );

  return { isAuthenticated, addresses, loading, error, refresh, remove };
}
