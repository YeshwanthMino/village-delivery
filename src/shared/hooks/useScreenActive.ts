import { NavigationContext } from '@react-navigation/native';
import { useCallback, useContext, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

/** Also supports shared UI rendered outside a navigator (e.g. root overlays). */
export function useScreenFocused() {
  const navigation = useContext(NavigationContext);
  const subscribe = useCallback((notify: () => void) => {
    const stopFocus = navigation?.addListener('focus', notify);
    const stopBlur = navigation?.addListener('blur', notify);
    return () => {
      stopFocus?.();
      stopBlur?.();
    };
  }, [navigation]);
  const getSnapshot = useCallback(() => navigation?.isFocused() ?? true, [navigation]);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

const subscribeAppState = (notify: () => void) => {
  const subscription = AppState.addEventListener('change', notify);
  return () => subscription.remove();
};
const isForeground = () => AppState.currentState == null || AppState.currentState === 'active';

/** Mounted stack screens and tabs must pause recurring work while hidden. */
export function useScreenActive() {
  const focused = useScreenFocused();
  const foreground = useSyncExternalStore(subscribeAppState, isForeground, isForeground);
  return focused && foreground;
}
