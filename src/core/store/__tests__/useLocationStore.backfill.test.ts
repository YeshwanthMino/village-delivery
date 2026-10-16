import { useLocationStore, getActiveBranchId } from '../useLocationStore';
import { findByLocation } from '@/src/features/location/data/locationApi';
import { StoredPrefs } from '@/src/base/services/remote/storage/StoredPrefs';

jest.mock('@/src/features/location/data/locationApi', () => ({ findByLocation: jest.fn() }));
jest.mock('@/src/base/services/remote/apiClient', () => ({ apiClient: { setBranchIdProvider: jest.fn() } }));
jest.mock('@/src/features/location/data/LocationService', () => ({ LocationService: {} }));
jest.mock('@/src/base/services/remote/storage/StoredPrefs', () => ({
  StoredPrefs: {
    getCustomData: jest.fn(),
    setCustomData: jest.fn().mockResolvedValue(undefined),
    removeCustomData: jest.fn().mockResolvedValue(undefined),
  },
}));

const find = findByLocation as jest.Mock;
const village = { id: 'v1', name: 'Errepalli', storeId: 's1', latitude: 13.36, longitude: 79.03 };

describe('useLocationStore.backfillBranchId', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useLocationStore.setState({ serviceableVillage: { ...village }, status: 'serviceable' });
  });

  test('saves branchId to the store and cache when the cached village lacks it', async () => {
    find.mockResolvedValue({ serviceable: true, village: { ...village, branchId: 'b1' } });
    await useLocationStore.getState().backfillBranchId();
    expect(find).toHaveBeenCalledWith({ latitude: 13.36, longitude: 79.03 });
    expect(useLocationStore.getState().serviceableVillage?.branchId).toBe('b1');
    expect(StoredPrefs.setCustomData).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ id: 'v1', branchId: 'b1' }),
    );
    expect(useLocationStore.getState().status).toBe('serviceable');
  });

  test('does nothing when the village already has a branchId', async () => {
    useLocationStore.setState({ serviceableVillage: { ...village, branchId: 'b0' } });
    await useLocationStore.getState().backfillBranchId();
    expect(find).not.toHaveBeenCalled();
  });

  test('ignores a result for a different store', async () => {
    find.mockResolvedValue({ serviceable: true, village: { ...village, storeId: 's2', branchId: 'b2' } });
    await useLocationStore.getState().backfillBranchId();
    expect(useLocationStore.getState().serviceableVillage?.branchId).toBeUndefined();
  });

  test('swallows network errors', async () => {
    find.mockRejectedValue(new Error('offline'));
    await expect(useLocationStore.getState().backfillBranchId()).resolves.toBeUndefined();
    expect(useLocationStore.getState().serviceableVillage?.branchId).toBeUndefined();
  });

  test('hydrate triggers the backfill for a cached village without branchId', async () => {
    (StoredPrefs.getCustomData as jest.Mock).mockImplementation(async (k: string) =>
      k.toLowerCase().includes('village') ? { ...village } : null,
    );
    find.mockResolvedValue({ serviceable: true, village: { ...village, branchId: 'b1' } });
    await useLocationStore.getState().hydrate();
    await new Promise((r) => setImmediate(r));
    expect(useLocationStore.getState().serviceableVillage?.branchId).toBe('b1');
  });

  test('waitForBranch resolves only after the in-flight lookup has saved the branch', async () => {
    let finish!: (v: any) => void;
    find.mockReturnValue(new Promise((r) => { finish = r; }));
    const backfill = useLocationStore.getState().backfillBranchId();
    let waited = false;
    const waiting = useLocationStore.getState().waitForBranch().then(() => { waited = true; });

    await new Promise((r) => setImmediate(r));
    expect(waited).toBe(false);

    finish({ serviceable: true, village: { ...village, branchId: 'b1' } });
    await waiting;
    await backfill;
    expect(useLocationStore.getState().serviceableVillage?.branchId).toBe('b1');
  });

  test('waitForBranch resolves immediately when nothing is in flight', async () => {
    await expect(useLocationStore.getState().waitForBranch()).resolves.toBeUndefined();
  });

  test('getActiveBranchId waits for the lookup, then returns the saved branch', async () => {
    let finish!: (v: any) => void;
    find.mockReturnValue(new Promise((r) => { finish = r; }));
    void useLocationStore.getState().backfillBranchId();
    const pending = getActiveBranchId();
    finish({ serviceable: true, village: { ...village, branchId: 'late-b' } });
    expect(await pending).toBe('late-b');
  });

  test('getActiveBranchId falls back to the persisted village when the store is empty', async () => {
    useLocationStore.setState({ serviceableVillage: null });
    (StoredPrefs.getCustomData as jest.Mock).mockResolvedValue({ storeId: 's1', branchId: 'disk-b' });
    expect(await getActiveBranchId()).toBe('disk-b');
  });

  test('getActiveBranchId is undefined when no branch anywhere or storage throws', async () => {
    (StoredPrefs.getCustomData as jest.Mock).mockRejectedValue(new Error('boom'));
    expect(await getActiveBranchId()).toBeUndefined();
  });

  test('waitForBranch also waits for hydrate, which starts the lookup', async () => {
    let loadVillage!: (v: any) => void;
    (StoredPrefs.getCustomData as jest.Mock).mockImplementation((k: string) =>
      k.toLowerCase().includes('village')
        ? new Promise((r) => { loadVillage = r; })
        : Promise.resolve(null),
    );
    find.mockResolvedValue({ serviceable: true, village: { ...village, branchId: 'b1' } });
    useLocationStore.setState({ serviceableVillage: null });

    void useLocationStore.getState().hydrate(); // village still loading from disk
    const waiting = useLocationStore.getState().waitForBranch();
    loadVillage({ ...village }); // cached village lacks branchId
    await waiting;

    expect(useLocationStore.getState().serviceableVillage?.branchId).toBe('b1');
  });

  test('waitForBranch does not reject when hydrate fails', async () => {
    (StoredPrefs.getCustomData as jest.Mock).mockRejectedValue(new Error('disk'));
    const hydrating = useLocationStore.getState().hydrate().catch(() => {});
    await expect(useLocationStore.getState().waitForBranch()).resolves.toBeUndefined();
    await hydrating;
  });
});
