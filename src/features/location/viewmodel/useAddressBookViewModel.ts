// src/features/location/viewmodel/useAddressBookViewModel.ts

import { useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '@/src/core/store';
import { useLocationStore } from '@/src/core/store/useLocationStore';
import { RemoteAddressRepository } from '../data/AddressRepository';

export function useAddressBookViewModel() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const addresses = useLocationStore((s) => s.savedAddresses);
  const setSavedAddresses = useLocationStore((s) => s.setSavedAddresses);
  const selectedAddressId = useLocationStore((s) => s.selectedAddressId);
  const setSelectedAddressId = useLocationStore((s) => s.setSelectedAddressId);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError(null);
    try {
      const list = await RemoteAddressRepository.list();
      setSavedAddresses(list);
    } catch {
      setError('failed');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, setSavedAddresses]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const select = useCallback((id: string) => setSelectedAddressId(id), [setSelectedAddressId]);

  const remove = useCallback(
    async (id: string) => {
      try {
        await RemoteAddressRepository.remove(id);
        setSavedAddresses(addresses.filter((a) => a.id !== id));
      } catch {
        setError('failed');
      }
    },
    [addresses, setSavedAddresses],
  );

  return {
    isAuthenticated,
    addresses,
    selectedAddressId,
    loading,
    error,
    refresh,
    select,
    remove,
  };
}
