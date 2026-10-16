import { useCallback, useRef } from 'react';

/** Lets a parent ScrollView recheck product rails as they enter its viewport. */
export function useImpressionViewportRegistry() {
  const checks = useRef(new Set<() => void>());
  const lastCheck = useRef(0);
  const registerCheck = useCallback((check: () => void) => {
    checks.current.add(check);
    return () => { checks.current.delete(check); };
  }, []);
  const checkVisible = useCallback(() => {
    const now = Date.now();
    if (now - lastCheck.current < 200) return;
    lastCheck.current = now;
    checks.current.forEach(check => check());
  }, []);
  return { registerCheck, checkVisible };
}
