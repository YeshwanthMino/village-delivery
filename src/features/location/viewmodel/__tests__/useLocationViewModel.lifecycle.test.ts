import { act, renderHook } from '@testing-library/react-native';
import { useLocationViewModel } from '../useLocationViewModel';

let mockFocused = true;
let mockBlocked = false;
let mockBlockedPromptDismissed = false;
const mockDetect = jest.fn();
const mockDismissBlockedPrompt = jest.fn(() => { mockBlockedPromptDismissed = true; });
const mockShowBlockedPrompt = jest.fn(() => { mockBlockedPromptDismissed = false; });
jest.mock('@/src/shared/hooks/useScreenActive', () => ({ useScreenFocused: () => mockFocused }));
jest.mock('@/src/core/store/useLocationStore', () => ({
  useLocationStore: (select: any) => select({
    detectCurrentLocation: mockDetect,
    blocked: mockBlocked,
    blockedPromptDismissed: mockBlockedPromptDismissed,
    dismissBlockedPrompt: mockDismissBlockedPrompt,
    showBlockedPrompt: mockShowBlockedPrompt,
  }),
}));

beforeEach(() => { jest.clearAllMocks(); mockFocused = true; mockBlocked = false; mockBlockedPromptDismissed = false; });

it('cancels sheet-owned GPS on close and gives a reopened sheet a fresh signal', () => {
  const { result, rerender, unmount } = renderHook(({ visible }) => useLocationViewModel(visible), { initialProps: { visible: true } });
  act(() => { void result.current.detectCurrentLocation(); });
  const first = mockDetect.mock.calls[0][0] as AbortSignal;
  rerender({ visible: false });
  expect(first.aborted).toBe(true);
  act(() => { void result.current.detectCurrentLocation(); });
  expect(mockDetect).toHaveBeenCalledTimes(1);
  rerender({ visible: true });
  act(() => { void result.current.detectCurrentLocation(); });
  const second = mockDetect.mock.calls[1][0] as AbortSignal;
  expect(second.aborted).toBe(false);
  unmount();
  expect(second.aborted).toBe(true);
});

it('cancels GPS when a mounted location screen loses focus', () => {
  const { result, rerender } = renderHook(useLocationViewModel);
  act(() => { void result.current.detectCurrentLocation(); });
  const signal = mockDetect.mock.calls[0][0] as AbortSignal;
  mockFocused = false;
  rerender(undefined);
  expect(signal.aborted).toBe(true);
});

it('respects a canceled Settings prompt on reopen but shows it after an explicit GPS retry', () => {
  mockBlocked = true;
  const { result, rerender } = renderHook(({ visible }) => useLocationViewModel(visible), { initialProps: { visible: true } });
  expect(result.current.blocked).toBe(true);
  act(() => result.current.dismissBlocked());
  rerender({ visible: true });
  expect(result.current.blocked).toBe(false);
  rerender({ visible: false });
  rerender({ visible: true });
  expect(result.current.blocked).toBe(false);
  act(() => { void result.current.detectCurrentLocation(); });
  rerender({ visible: true });
  expect(result.current.blocked).toBe(true);
});

it('does not open a second blocked prompt on a newly mounted location screen after Cancel', () => {
  mockBlocked = true;
  const first = renderHook(useLocationViewModel);
  act(() => first.result.current.dismissBlocked());
  const second = renderHook(useLocationViewModel);
  expect(second.result.current.blocked).toBe(false);
  act(() => { void second.result.current.detectCurrentLocation(); });
  second.rerender(undefined);
  expect(second.result.current.blocked).toBe(true);
});
