import { act, renderHook } from '@testing-library/react-native';
import { useSingleFlight } from '../useSingleFlight';

it('shares one pending action across immediate taps and rerenders, then allows another', async () => {
  let finish!: (value: boolean) => void;
  const action = jest.fn(() => new Promise<boolean>(resolve => { finish = resolve; }));
  const { result, rerender } = renderHook(() => useSingleFlight(action));
  const first = result.current();
  expect(result.current()).toBe(first);
  rerender(undefined);
  expect(result.current()).toBe(first);
  await act(async () => { await Promise.resolve(); });
  expect(action).toHaveBeenCalledTimes(1);
  await act(async () => { finish(true); await first; });
  action.mockResolvedValueOnce(false);
  await expect(result.current()).resolves.toBe(false);
  expect(action).toHaveBeenCalledTimes(2);
});

it('allows a retry after a rejected action', async () => {
  const action = jest.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(true);
  const { result } = renderHook(() => useSingleFlight(action));
  await expect(result.current()).rejects.toThrow('offline');
  await expect(result.current()).resolves.toBe(true);
});
