import { useLocationStore } from '../useLocationStore';
import { useStoreConfigStore } from '../useStoreConfigStore';
import { startStoreConfigSync } from '../storeConfigSync';
import { fetchStoreConfig } from '@/src/features/storeConfig/data/storeConfigApi';
import type { Village } from '@/src/features/location/domain/models';

jest.mock('@/src/features/storeConfig/data/storeConfigApi', () => ({ fetchStoreConfig: jest.fn() }));
jest.mock('@/src/base/services/remote/apiClient', () => ({ apiClient: { setBranchIdProvider: jest.fn() } }));
jest.mock('@/src/features/location/data/locationApi', () => ({ findByLocation: jest.fn() }));
jest.mock('@/src/features/location/data/LocationService', () => ({ LocationService: {} }));
jest.mock('@/src/base/services/remote/storage/StoredPrefs', () => ({
  StoredPrefs: {
    getCustomData: jest.fn().mockResolvedValue(null),
    setCustomData: jest.fn().mockResolvedValue(undefined),
    removeCustomData: jest.fn().mockResolvedValue(undefined),
  },
}));

const fetchMock = fetchStoreConfig as jest.Mock;
const storeFor = (id: string) => ({ store: { id, timings: null } as any, cashbackSettings: null });
const village = (storeId: string, branchId?: string): Village => ({ id: `v-${storeId}`, name: 'V', storeId, branchId });
const flush = () => new Promise((r) => setImmediate(r));

let stop: () => void;
beforeEach(() => {
  jest.clearAllMocks();
  fetchMock.mockResolvedValue(storeFor('default'));
  useStoreConfigStore.getState().reset();
  useLocationStore.setState({ hydrated: true, serviceableVillage: village('s1', 'b1') });
  stop = startStoreConfigSync();
});
afterEach(() => stop());

describe('storeConfigSync', () => {
  test('re-fetches the config when the user changes village', async () => {
    fetchMock.mockResolvedValue(storeFor('s2'));
    useLocationStore.setState({ serviceableVillage: village('s2', 'b2') });
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(useStoreConfigStore.getState().store?.id).toBe('s2');
  });

  test('re-fetches when the same village gains a branch', async () => {
    useLocationStore.setState({ serviceableVillage: village('s1') });
    await flush();
    fetchMock.mockClear();
    useLocationStore.setState({ serviceableVillage: village('s1', 'b1') });
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test('does not re-fetch when the store and branch are unchanged', async () => {
    useLocationStore.setState({ serviceableVillage: { ...village('s1', 'b1'), name: 'Renamed' } });
    await flush();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('skips the first hydration (the startup load covers it)', async () => {
    useLocationStore.setState({ hydrated: false, serviceableVillage: null });
    fetchMock.mockClear();
    useLocationStore.setState({ hydrated: true, serviceableVillage: village('s1', 'b1') });
    await flush();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('drops the previous village timings while the new config loads', async () => {
    useStoreConfigStore.setState({ store: { id: 'old', timings: {} } as any, status: 'ready' });
    let finish!: (v: unknown) => void;
    fetchMock.mockReturnValue(new Promise((r) => { finish = r; }));
    useLocationStore.setState({ serviceableVillage: village('s2', 'b2') });
    expect(useStoreConfigStore.getState().store).toBeNull();
    finish(storeFor('s2'));
    await flush();
    expect(useStoreConfigStore.getState().store?.id).toBe('s2');
  });

  test('a slow reply for the old village cannot overwrite the new one', async () => {
    const resolvers: Array<(v: unknown) => void> = [];
    fetchMock.mockImplementation(() => new Promise((r) => { resolvers.push(r); }));
    useLocationStore.setState({ serviceableVillage: village('s2', 'b2') }); // request 1
    useLocationStore.setState({ serviceableVillage: village('s3', 'b3') }); // request 2
    resolvers[1](storeFor('s3'));
    await flush();
    resolvers[0](storeFor('s2')); // stale, arrives last
    await flush();
    expect(useStoreConfigStore.getState().store?.id).toBe('s3');
  });
});
