import { act, renderHook } from '@testing-library/react-native';
import { getHomeLayout } from '../../../data/homeLayoutApi';
import { useHomeLayoutViewModel } from '../useHomeLayoutViewModel';

let mockActive = true;
let mockBranch = 'branch-a';
jest.mock('@/src/shared/hooks/useScreenActive', () => ({ useScreenActive: () => mockActive }));
jest.mock('@/src/core/utils/getStoreId', () => ({ useStoreId: () => 'store' }));
jest.mock('@/src/core/store/useLocationStore', () => ({
  useLocationStore: (selector: any) => selector({ serviceableVillage: { branchId: mockBranch } }),
}));
jest.mock('../../../data/homeLayoutApi', () => ({ getHomeLayout: jest.fn() }));
const fetchLayout = getHomeLayout as jest.Mock;

beforeEach(() => { mockActive = true; mockBranch = 'branch-a'; fetchLayout.mockReset(); });

it('aborts superseded loads and ignores their late results', async () => {
  let finishOld!: (value: any) => void;
  fetchLayout.mockImplementationOnce(() => new Promise(resolve => { finishOld = resolve; }));
  const { result } = renderHook(useHomeLayoutViewModel);
  const oldSignal = fetchLayout.mock.calls[0][2] as AbortSignal;
  fetchLayout.mockResolvedValueOnce({ sections: [{ id: 'new' }] });
  await act(async () => { await result.current.refresh(); });
  expect(oldSignal.aborted).toBe(true);
  await act(async () => { finishOld({ sections: [{ id: 'old' }] }); });
  expect(result.current.sections).toEqual([{ id: 'new' }]);
  expect(result.current.loading).toBe(false);
});

it('cancels on blur/unmount, resumes on focus and clears data for another branch', async () => {
  fetchLayout.mockResolvedValueOnce({ sections: [{ id: 'a' }] });
  const { result, rerender, unmount } = renderHook(useHomeLayoutViewModel);
  await act(async () => {});
  expect(result.current.sections).toEqual([{ id: 'a' }]);
  mockActive = false;
  rerender(undefined);
  expect(fetchLayout.mock.calls[0][2].aborted).toBe(true);
  mockBranch = 'branch-b';
  rerender(undefined);
  expect(result.current.sections).toEqual([]);
  expect(fetchLayout).toHaveBeenCalledTimes(1);
  fetchLayout.mockImplementationOnce(() => new Promise(() => {}));
  mockActive = true;
  rerender(undefined);
  expect(fetchLayout).toHaveBeenCalledTimes(2);
  const signal = fetchLayout.mock.calls[1][2] as AbortSignal;
  unmount();
  expect(signal.aborted).toBe(true);
});
