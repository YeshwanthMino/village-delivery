// src/features/storeConfig/viewmodel/useStoreClosedOnOpen.ts
//
// Home-screen trigger for the store-closed sheet: evaluated once each time the
// app is opened — a cold start once the store config lands, and every return
// from the background — so a customer opening the app out of hours learns
// before shopping that delivery waits for the store to open.

import React from 'react';
import { AppState } from 'react-native';
import { useStoreConfigStore, useStoreTimings } from '@/src/core/store';
import { logger } from '@/src/base/services/logger';
import {
  getStoreStatus,
  needsStoreClosedNotice,
  type StoreStatus,
} from '../domain/storeStatus';

// Module-scoped: HomeScreen remounting (tab resets, navigation) is not an app open.
let shownThisOpen = false;

export function useStoreClosedOnOpen() {
  const timings = useStoreTimings();
  const configStatus = useStoreConfigStore((s) => s.status);
  const [status, setStatus] = React.useState<StoreStatus>({ kind: 'unknown' });
  const [visible, setVisible] = React.useState(false);

  const evaluate = React.useCallback(() => {
    // Wait for the fetch to settle; a failed one yields no timings, so no sheet.
    if (shownThisOpen || (configStatus !== 'ready' && configStatus !== 'error')) return;
    const next = getStoreStatus(timings);
    logger.debug('[StoreClosedSheet] home check', { configStatus, hasTimings: !!timings, status: next.kind });
    shownThisOpen = true;
    if (!needsStoreClosedNotice(next)) return;
    setStatus(next);
    setVisible(true);
  }, [timings, configStatus]);

  React.useEffect(evaluate, [evaluate]);

  React.useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background') shownThisOpen = false;
      if (state === 'active') evaluate();
    });
    return () => sub.remove();
  }, [evaluate]);

  return { visible, status, timings, close: () => setVisible(false) };
}
