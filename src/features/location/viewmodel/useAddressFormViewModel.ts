// src/features/location/viewmodel/useAddressFormViewModel.ts

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocationStore } from '@/src/core/store/useLocationStore';
import { AddressTag } from '../domain/models';
import { CreateAddressInput } from '../data/locationApi';
import { RemoteAddressRepository } from '../data/AddressRepository';

interface FormState {
  addressLine1: string;
  addressLine2: string;
  landmark: string;
  pincode: string;
  tag: AddressTag;
  isDefault: boolean;
}

const EMPTY: FormState = {
  addressLine1: '',
  addressLine2: '',
  landmark: '',
  pincode: '',
  tag: 'home',
  isDefault: false,
};

export function useAddressFormViewModel(editId?: string) {
  const village = useLocationStore((s) => s.serviceableVillage);
  const savedAddresses = useLocationStore((s) => s.savedAddresses);
  const setSavedAddresses = useLocationStore((s) => s.setSavedAddresses);

  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ addressLine1?: string; pincode?: string }>({});

  // Prefill when editing.
  useEffect(() => {
    if (!editId) return;
    const existing = savedAddresses.find((a) => a.id === editId);
    if (existing) {
      setForm({
        addressLine1: existing.addressLine1,
        addressLine2: existing.addressLine2 ?? '',
        landmark: existing.landmark ?? '',
        pincode: existing.pincode ?? '',
        tag: existing.tag,
        isDefault: existing.isDefault,
      });
    }
  }, [editId, savedAddresses]);

  const set = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const validate = useCallback((): boolean => {
    const next: { addressLine1?: string; pincode?: string } = {};
    if (!form.addressLine1.trim()) next.addressLine1 = 'err_house_required';
    if (form.pincode && !/^\d{6}$/.test(form.pincode.trim())) next.pincode = 'err_pincode_invalid';
    setErrors(next);
    return Object.keys(next).length === 0;
  }, [form]);

  const villageName = village?.name ?? '';
  const canResolveVillage = useMemo(() => !!village?.id, [village]);

  const save = useCallback(async (): Promise<boolean> => {
    if (!validate() || !village) return false;
    setSaving(true);
    try {
      const input: CreateAddressInput = {
        villageId: village.id,
        addressLine1: form.addressLine1.trim(),
        addressLine2: form.addressLine2.trim() || undefined,
        landmark: form.landmark.trim() || undefined,
        pincode: form.pincode.trim() || village.pincode,
        latitude: village.latitude,
        longitude: village.longitude,
        isDefault: form.isDefault,
        tag: form.tag,
      };
      const saved = editId
        ? await RemoteAddressRepository.update(editId, input)
        : await RemoteAddressRepository.create(input);
      const others = savedAddresses.filter((a) => a.id !== saved.id);
      setSavedAddresses([saved, ...others]);
      return true;
    } catch {
      return false;
    } finally {
      setSaving(false);
    }
  }, [validate, village, form, editId, savedAddresses, setSavedAddresses]);

  return { form, set, errors, saving, save, villageName, villagePincode: village?.pincode, canResolveVillage };
}
