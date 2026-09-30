import { act, renderHook } from '@testing-library/react-native';
import { useVillageSearch } from '../useVillageSearch';
import { useVillageSearchQuery } from '../../data/queries/useVillageSearchQuery';

let mockFocused = true;
jest.mock('@/src/shared/hooks/useScreenActive', () => ({ useScreenFocused: () => mockFocused }));
jest.mock('../../data/queries/useVillageSearchQuery', () => ({ useVillageSearchQuery: jest.fn(() => ({ data: [] })) }));

beforeEach(() => { jest.useFakeTimers(); jest.clearAllMocks(); mockFocused = true; });
afterEach(() => jest.useRealTimers());

it('clears the pending search debounce on blur and resumes the preserved text on return', () => {
  const { result, rerender, unmount } = renderHook(() => useVillageSearch());
  act(() => result.current.setQuery('village'));
  mockFocused = false; rerender(undefined);
  expect(jest.getTimerCount()).toBe(0);
  act(() => jest.advanceTimersByTime(1000));
  expect(useVillageSearchQuery).toHaveBeenLastCalledWith('');
  mockFocused = true; rerender(undefined);
  act(() => jest.advanceTimersByTime(500));
  expect(useVillageSearchQuery).toHaveBeenLastCalledWith('village');
  mockFocused = false; rerender(undefined);
  expect(useVillageSearchQuery).toHaveBeenLastCalledWith('');
  expect(result.current.query).toBe('village');
  unmount();
  expect(jest.getTimerCount()).toBe(0);
});
