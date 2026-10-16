import { NavigationContext } from '@react-navigation/native';
import { useRouter, type Href } from 'expo-router';
import { useCallback, useContext, useEffect, useMemo, useRef } from 'react';

const TAP_WINDOW_MS = 750;
type Gate = { blockedUntil: number };
// Cards, headers and sheets on one screen share a gate. A component-local
// debounce would still allow tapping two different buttons to push two routes.
const screenGates = new WeakMap<object, Gate>();

type GuardedRouter = Omit<ReturnType<typeof useRouter>, 'back'> & { back: (fallback?: Href) => void };

export function useGuardedRouter(): GuardedRouter {
  const router = useRouter();
  const navigation = useContext(NavigationContext);
  const localGate = useRef<Gate>({ blockedUntil: 0 });
  let gate = localGate.current;
  if (navigation) {
    const shared = screenGates.get(navigation);
    if (shared) gate = shared;
    else screenGates.set(navigation, gate);
  }

  useEffect(() => navigation?.addListener('focus', () => {
    // Returning to this screen should make its controls usable immediately.
    gate.blockedUntil = 0;
  }), [navigation, gate]);

  const run = useCallback((action: () => void) => {
    if (navigation && !navigation.isFocused()) return;
    const now = Date.now();
    if (now < gate.blockedUntil) return;
    gate.blockedUntil = now + TAP_WINDOW_MS;
    try {
      action();
    } catch (error) {
      gate.blockedUntil = 0;
      throw error;
    }
  }, [navigation, gate]);

  // No timer is allocated. The short deadline also releases the gate when an
  // action is a no-op (e.g. navigating to the currently selected tab).
  return useMemo(() => ({
    ...router,
    push: (...args: Parameters<typeof router.push>) => run(() => router.push(...args)),
    navigate: (...args: Parameters<typeof router.navigate>) => run(() => router.navigate(...args)),
    replace: (...args: Parameters<typeof router.replace>) => run(() => router.replace(...args)),
    back: (fallback: Href = '/(dashboard)/home') => run(() => {
      if (router.canGoBack()) router.back();
      else router.replace(fallback);
    }),
    dismiss: (...args: Parameters<typeof router.dismiss>) => run(() => router.dismiss(...args)),
    dismissTo: (...args: Parameters<typeof router.dismissTo>) => run(() => router.dismissTo(...args)),
    dismissAll: () => run(() => router.dismissAll()),
  }), [router, run]);
}
