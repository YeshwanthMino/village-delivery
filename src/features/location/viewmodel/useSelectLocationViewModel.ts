// src/features/location/viewmodel/useSelectLocationViewModel.ts

import { useState } from 'react';
import { useLocationGateViewModel } from './useLocationGateViewModel';

export function useSelectLocationViewModel() {
  const gate = useLocationGateViewModel();
  const [search, setSearch] = useState('');

  // Logged-out search is disabled: only find-by-location (lat/lng) is public.
  const searchEnabled = false;

  const requestFromFriend = () => {
    // Stub — WhatsApp share flow not implemented in this scope.
  };

  return { ...gate, search, setSearch, searchEnabled, requestFromFriend };
}
