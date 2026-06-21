// src/features/location/viewmodel/useAddAddressViewModel.ts
//
// Add-address orchestration for the delivery-address screen's "add" mode.
// Reuses useMapPickerViewModel for the map + serviceability, and adds the
// address-details form fields and the save sequence.

import { useCallback, useState } from 'react';
import { useMapPickerViewModel } from './useMapPickerViewModel';
import { useAuthStore } from '@/src/core/store/useAuthStore';
import { useLocationStore } from '@/src/core/store/useLocationStore';
import { createAddress, listAddresses, type CreateAddressInput } from '../data/locationApi';
import { saveNewAddress } from '../data/saveNewAddress';
import type { AddressTag } from '../domain/models';

export function useAddAddressViewModel() {
  const map = useMapPickerViewModel();
  const setSavedAddresses = useLocationStore((s) => s.setSavedAddresses);
  const setSelectedAddress = useLocationStore((s) => s.setSelectedAddress);
  const mobileNumber = useAuthStore((s) => s.mobileNumber ?? s.user?.mobileNumber ?? '');

  const [addressLine1, setAddressLine1] = useState('');
  const [landmark, setLandmark] = useState('');
  const [tag, setTag] = useState<AddressTag>('home');
  const [isDefault, setIsDefault] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSave =
    map.pinState === 'serviceable' &&
    !!map.village &&
    !!map.region &&
    addressLine1.trim().length > 0 &&
    !saving;

  const save = useCallback(async (): Promise<boolean> => {
    if (map.pinState !== 'serviceable' || !map.village || !map.region) return false;
    if (!addressLine1.trim()) return false;
    setSaving(true);
    setError(null);
    const input: CreateAddressInput = {
      villageId: map.village.id,
      addressLine1: addressLine1.trim(),
      landmark: landmark.trim() || undefined,
      latitude: map.region.latitude,
      longitude: map.region.longitude,
      isDefault,
      tag,
      mobileNumber,
    };
    try {
      await saveNewAddress(input, {
        create: createAddress,
        list: listAddresses,
        setSelected: setSelectedAddress,
        setSaved: setSavedAddresses,
      });
      return true;
    } catch (e: any) {
      setError(e?.fullMessage || e?.message || 'Could not save address. Try again.');
      return false;
    } finally {
      setSaving(false);
    }
  }, [map.pinState, map.village, map.region, addressLine1, landmark, tag, isDefault, mobileNumber, setSelectedAddress, setSavedAddresses]);

  return {
    map,
    addressLine1, setAddressLine1,
    landmark, setLandmark,
    tag, setTag,
    isDefault, setIsDefault,
    saving, error, canSave, save,
  };
}
