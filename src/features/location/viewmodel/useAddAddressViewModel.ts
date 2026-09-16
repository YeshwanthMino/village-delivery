// src/features/location/viewmodel/useAddAddressViewModel.ts
//
// Add-address orchestration for the delivery-address screen's "add" mode.
// Reuses useMapPickerViewModel for the map + serviceability, and adds the
// address-details form fields and the save sequence.

import { useCallback, useState } from 'react';
import { useMapPickerViewModel, DEFAULT_REGION } from './useMapPickerViewModel';
import { useAuthStore } from '@/src/core/store/useAuthStore';
import { useLocationStore } from '@/src/core/store/useLocationStore';
import { createAddress, listAddresses, updateAddress, type CreateAddressInput } from '../data/locationApi';
import { saveNewAddress, updateExistingAddress } from '../data/saveNewAddress';
import type { AddressTag, Address } from '../domain/models';

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
  const [editingId, setEditingId] = useState<string | null>(null);

  const canSave =
    map.pinState === 'serviceable' &&
    !!map.village &&
    !!map.region &&
    addressLine1.trim().length > 0 &&
    !saving;

  const beginEdit = useCallback((address: Address) => {
    setEditingId(address.id);
    setAddressLine1(address.addressLine1 ?? '');
    setLandmark(address.landmark ?? '');
    setTag(address.tag);
    setIsDefault(address.isDefault);
    setError(null);
    if (address.latitude != null && address.longitude != null) {
      map.onRegionSettled({
        latitude: address.latitude,
        longitude: address.longitude,
        latitudeDelta: DEFAULT_REGION.latitudeDelta,
        longitudeDelta: DEFAULT_REGION.longitudeDelta,
      });
    }
  }, [map]);

  const reset = useCallback(() => {
    setEditingId(null);
    setAddressLine1('');
    setLandmark('');
    setTag('home');
    setIsDefault(false);
    setError(null);
  }, []);

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
      if (editingId) {
        await updateExistingAddress(editingId, input, {
          update: updateAddress,
          list: listAddresses,
          setSelected: setSelectedAddress,
          setSaved: setSavedAddresses,
        });
      } else {
        await saveNewAddress(input, {
          create: createAddress,
          list: listAddresses,
          setSelected: setSelectedAddress,
          setSaved: setSavedAddresses,
        });
      }
      return true;
    } catch (e: any) {
      setError(e?.fullMessage || e?.message || 'Could not save address. Try again.');
      return false;
    } finally {
      setSaving(false);
    }
  }, [map.pinState, map.village, map.region, addressLine1, landmark, tag, isDefault, mobileNumber, setSelectedAddress, setSavedAddresses, editingId]);

  return {
    map,
    addressLine1, setAddressLine1,
    landmark, setLandmark,
    tag, setTag,
    isDefault, setIsDefault,
    saving, error, canSave, save,
    editingId, beginEdit, reset,
  };
}
