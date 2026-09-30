import { act, renderHook } from '@testing-library/react-native';
import { BackHandler, Keyboard } from 'react-native';
import { useBackAction } from '../useBackAction';

let mockFocused = true;
jest.mock('../useScreenActive', () => ({ useScreenFocused: () => mockFocused }));
let hardwareBack!: () => boolean | null | undefined;
const remove = jest.fn();

beforeEach(() => {
  jest.useFakeTimers(); mockFocused = true; remove.mockClear();
  jest.spyOn(Keyboard, 'isVisible').mockReturnValue(false);
  jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_event, handler) => {
    hardwareBack = handler;
    return { remove };
  });
});
afterEach(() => { jest.restoreAllMocks(); jest.useRealTimers(); });

it('shares one action between the arrow and system Back without skipping steps on repeated presses', () => {
  const action = jest.fn();
  const { result, rerender } = renderHook(({ onBack }) => useBackAction(onBack), { initialProps: { onBack: action } });
  act(() => { expect(hardwareBack()).toBe(true); });
  const nextStep = jest.fn();
  rerender({ onBack: nextStep });
  act(() => { result.current(); hardwareBack(); });
  expect(action).toHaveBeenCalledTimes(1);
  expect(nextStep).not.toHaveBeenCalled();
  act(() => { jest.advanceTimersByTime(350); hardwareBack(); });
  expect(nextStep).toHaveBeenCalledTimes(1);
});

it('releases its listener on blur/unmount and allows immediate Back when returning', () => {
  const action = jest.fn();
  const { result, rerender, unmount } = renderHook(() => useBackAction(action));
  act(() => result.current());
  mockFocused = false; rerender(undefined);
  expect(remove).toHaveBeenCalledTimes(1);
  act(() => result.current());
  expect(action).toHaveBeenCalledTimes(1);
  mockFocused = true; rerender(undefined);
  act(() => result.current());
  expect(action).toHaveBeenCalledTimes(2);
  unmount();
  expect(remove).toHaveBeenCalledTimes(2);
  expect(jest.getTimerCount()).toBe(0);
});

it('dismisses the keyboard first, preserving the current form', () => {
  const dismiss = jest.spyOn(Keyboard, 'dismiss').mockImplementation(() => {});
  const visible = jest.spyOn(Keyboard, 'isVisible').mockReturnValue(true);
  const action = jest.fn();
  const { result } = renderHook(() => useBackAction(action));
  act(() => result.current());
  expect(dismiss).toHaveBeenCalledTimes(1);
  expect(action).not.toHaveBeenCalled();
  visible.mockReturnValue(false);
  act(() => { jest.advanceTimersByTime(350); result.current(); });
  expect(action).toHaveBeenCalledTimes(1);
});
