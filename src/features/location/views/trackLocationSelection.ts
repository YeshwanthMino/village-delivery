import { analytics } from '@/src/base/services/analytics';
import { useLocationStore } from '@/src/core/store/useLocationStore';

export type LocationSelectionMethod = 'auto_gps' | 'gps' | 'search' | 'recent' | 'saved_address' | 'map';

/** Call only after a selection action has confirmed a serviceable location. */
export function trackActiveLocationSelection(method: LocationSelectionMethod): void {
  const { status, serviceableVillage } = useLocationStore.getState();
  if (status !== 'serviceable' || !serviceableVillage) return;
  analytics.track('location_selected', {
    village_id: serviceableVillage.id,
    ...(serviceableVillage.storeId ? { store_id: serviceableVillage.storeId } : {}),
    method,
  });
}
