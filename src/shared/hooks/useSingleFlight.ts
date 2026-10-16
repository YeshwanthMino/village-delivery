import { useCallback, useRef } from 'react';

/** Acquire synchronously, before any await or render can allow a second tap. */
export function useSingleFlight<Args extends unknown[], Result>(
  action: (...args: Args) => Promise<Result>,
): (...args: Args) => Promise<Result> {
  const pending = useRef<Promise<Result> | null>(null);
  return useCallback((...args: Args) => {
    if (pending.current) return pending.current;
    const request = Promise.resolve().then(() => action(...args));
    pending.current = request;
    const release = () => {
      if (pending.current === request) pending.current = null;
    };
    void request.then(release, release);
    return request;
  }, [action]);
}
