import { useCallback, useEffect, useRef } from 'react';
import { BackHandler, Keyboard } from 'react-native';
import { useScreenFocused } from './useScreenActive';

/** Keep the screen arrow and Android Back on the same path, one step per tap. */
export function useBackAction(action: () => void) {
  const focused = useScreenFocused();
  const latest = useRef(action);
  const blockedUntil = useRef(0);
  useEffect(() => { latest.current = action; }, [action]);
  useEffect(() => { blockedUntil.current = 0; }, [focused]);

  const back = useCallback(() => {
    if (!focused || Date.now() < blockedUntil.current) return;
    blockedUntil.current = Date.now() + 350;
    // Android normally consumes Back in the IME before JS sees it. Match that
    // behavior for screen arrows and modal Back callbacks as well.
    if (Keyboard.isVisible()) Keyboard.dismiss();
    else latest.current();
  }, [focused]);

  useEffect(() => {
    if (!focused) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      back();
      return true;
    });
    return () => subscription.remove();
  }, [focused, back]);

  return back;
}
