import { useLocationStore } from '../useLocationStore';
import { LocationService } from '@/src/features/location/data/LocationService';
import { findByLocation } from '@/src/features/location/data/locationApi';
import { StoredPrefs } from '@/src/base/services/remote/storage/StoredPrefs';
import { isActiveRecentLocation } from '@/src/features/location/domain/recentLocations';

jest.mock('@/src/features/location/data/locationApi', () => ({ findByLocation: jest.fn() }));
jest.mock('@/src/base/services/remote/apiClient', () => ({ apiClient: { setBranchIdProvider: jest.fn() } }));
jest.mock('@/src/features/location/data/LocationService', () => ({ LocationService: {
  getPermissionState: jest.fn(), requestPermission: jest.fn(), getCurrentPosition: jest.fn(), geocode: jest.fn(),
} }));
jest.mock('@/src/base/services/remote/storage/StoredPrefs', () => ({ StoredPrefs: {
  getCustomData: jest.fn(), setCustomData: jest.fn(), removeCustomData: jest.fn(),
} }));
const service = LocationService as jest.Mocked<typeof LocationService>;
const find = findByLocation as jest.Mock;
const selected = { id: 'chosen', name: 'Chosen village', storeId: 's1', branchId: 'b1', latitude: 12, longitude: 78 };
const gpsVillage = { ...selected, id: 'gps', name: 'GPS village' };
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

beforeEach(async () => {
  jest.resetAllMocks();
  await useLocationStore.getState().clearLocation();
  useLocationStore.setState({ permission: 'undetermined', blocked: false, recentLocations: [], selectedAddressId: null });
  service.getPermissionState.mockResolvedValue('granted');
  service.requestPermission.mockResolvedValue({ granted: true, canAskAgain: true });
  service.getCurrentPosition.mockResolvedValue({ latitude: 13, longitude: 79 });
  find.mockResolvedValue({ serviceable: true, village: gpsVillage });
});

it.each(['resolve', 'reject'] as const)('does not let a late GPS %s overwrite a manual selection', async (outcome) => {
  const gps = deferred<{ latitude: number; longitude: number }>();
  service.getCurrentPosition.mockReturnValueOnce(gps.promise);
  const request = useLocationStore.getState().detectCurrentLocation();
  await Promise.resolve();
  const signal = service.getCurrentPosition.mock.calls[0][0];
  await useLocationStore.getState().selectVillage(selected);
  expect(signal?.aborted).toBe(true);
  if (outcome === 'resolve') gps.resolve({ latitude: 13, longitude: 79 });
  else gps.reject(new Error('LOCATION_TIMEOUT'));
  expect(await request).toBe(false);
  expect(useLocationStore.getState()).toMatchObject({ serviceableVillage: selected, status: 'serviceable', detecting: false, lastError: null });
  expect(find).not.toHaveBeenCalled();
});

it('ignores a stale permission result after a manual selection', async () => {
  const permission = deferred<{ granted: boolean; canAskAgain: boolean }>();
  service.requestPermission.mockReturnValueOnce(permission.promise);
  const request = useLocationStore.getState().detectCurrentLocation();
  await useLocationStore.getState().selectVillage(selected);
  permission.resolve({ granted: false, canAskAgain: false });
  expect(await request).toBe(false);
  expect(service.requestPermission).toHaveBeenCalledTimes(1);
  expect(service.getCurrentPosition).not.toHaveBeenCalled();
  expect(useLocationStore.getState().serviceableVillage).toEqual(selected);
});

it('requests permission directly for an explicit GPS action before reading a fix', async () => {
  service.getPermissionState.mockRejectedValueOnce(new Error('status unavailable'));
  service.requestPermission.mockResolvedValueOnce({ granted: false, canAskAgain: true });

  expect(await useLocationStore.getState().detectCurrentLocation()).toBe(false);

  expect(service.requestPermission).toHaveBeenCalledTimes(1);
  expect(service.getPermissionState).not.toHaveBeenCalled();
  expect(service.getCurrentPosition).not.toHaveBeenCalled();
  expect(useLocationStore.getState()).toMatchObject({ permission: 'denied', blocked: false, detecting: false });
});

it('aborts the screen-owned request and ignores a late serviceability result after close', async () => {
  const lookup = deferred<any>();
  find.mockReturnValueOnce(lookup.promise);
  const controller = new AbortController();
  const request = useLocationStore.getState().detectCurrentLocation(controller.signal);
  await Promise.resolve(); await Promise.resolve();
  const signal = find.mock.calls[0][1] as AbortSignal;
  controller.abort();
  expect(signal.aborted).toBe(true);
  lookup.resolve({ serviceable: true, village: gpsVillage });
  expect(await request).toBe(false);
  expect(useLocationStore.getState()).toMatchObject({ status: 'idle', detecting: false, serviceableVillage: null });
});

it('does not allow a cancelled older request to cancel a newer selection', async () => {
  const controller = new AbortController();
  const request = useLocationStore.getState().detectCurrentLocation(controller.signal);
  await useLocationStore.getState().selectVillage(selected);
  controller.abort();
  await request;
  expect(useLocationStore.getState()).toMatchObject({ serviceableVillage: selected, status: 'serviceable' });
});

it('ignores a late geocode failure after the village changes', async () => {
  const geocode = deferred<any>();
  service.geocode.mockReturnValueOnce(geocode.promise);
  const request = useLocationStore.getState().searchLocation('Old place');
  await useLocationStore.getState().selectVillage(selected);
  geocode.reject(new Error('offline'));
  expect(await request).toBe(false);
  expect(useLocationStore.getState()).toMatchObject({ serviceableVillage: selected, status: 'serviceable', lastError: null });
});

it('does not backfill a branch into a different village served by the same store', async () => {
  useLocationStore.setState({ serviceableVillage: { ...gpsVillage, branchId: undefined } });
  const lookup = deferred<any>();
  find.mockReturnValueOnce(lookup.promise);
  const request = useLocationStore.getState().backfillBranchId();
  await useLocationStore.getState().selectVillage({ ...selected, branchId: undefined });
  lookup.resolve({ serviceable: true, village: { ...gpsVillage, branchId: 'old-branch' } });
  await request;
  expect(useLocationStore.getState().serviceableVillage).toEqual({ ...selected, branchId: undefined });
});

it('does not restore old persisted data over a newer manual selection', async () => {
  const disk = deferred<any>();
  (StoredPrefs.getCustomData as jest.Mock).mockReturnValue(disk.promise);
  const request = useLocationStore.getState().hydrate();
  await useLocationStore.getState().selectVillage(selected);
  disk.resolve(gpsVillage);
  await request;
  expect(useLocationStore.getState()).toMatchObject({ serviceableVillage: selected, hydrated: true });
});

it('publishes the selected address only after its store is persisted for API headers', async () => {
  const saved = deferred<void>();
  (StoredPrefs.setCustomData as jest.Mock).mockReturnValueOnce(saved.promise);
  const request = useLocationStore.getState().selectAddress({
    id: 'address-1', villageId: selected.id, villageName: selected.name,
    storeId: selected.storeId, branchId: selected.branchId,
    addressLine1: '1 Main Street', tag: 'home', isDefault: false,
  });
  expect(useLocationStore.getState().serviceableVillage?.id).toBe(selected.id);
  expect(useLocationStore.getState().selectedAddressId).toBeNull();
  saved.resolve();
  expect(await request).toBe(true);
  expect(useLocationStore.getState().selectedAddressId).toBe('address-1');
});

it('shows recently selected saved-address villages separately even when one store serves both', async () => {
  const first = {
    id: 'address-1', villageId: 'v1', villageName: 'Errepalli', storeId: 's1',
    addressLine1: '1 Main Street', tag: 'home' as const, isDefault: false,
  };
  const second = {
    id: 'address-2', villageId: 'v2', villageName: 'Mittoor', storeId: 's1',
    addressLine1: '2 Main Street', tag: 'work' as const, isDefault: false,
  };

  expect(await useLocationStore.getState().selectAddress(first)).toBe(true);
  expect(await useLocationStore.getState().selectAddress(second)).toBe(true);

  const state = useLocationStore.getState();
  expect(state.recentLocations.map((recent) => recent.villageName)).toEqual(['Mittoor', 'Errepalli']);
  expect(isActiveRecentLocation(state.recentLocations[0], state.serviceableVillage)).toBe(true);
  expect(isActiveRecentLocation(state.recentLocations[1], state.serviceableVillage)).toBe(false);
});

it('records the resolved village when selecting a legacy saved address without a store ID', async () => {
  const address = {
    id: 'legacy-address', villageId: '', villageName: 'Old name',
    latitude: 13, longitude: 79, addressLine1: '3 Main Street',
    tag: 'home' as const, isDefault: false,
  };

  expect(await useLocationStore.getState().selectAddress(address)).toBe(true);
  expect(useLocationStore.getState().recentLocations[0].villageName).toBe('GPS village');
});
