// src/features/storeConfig/viewmodel/useStoreClosedOnOpen.ts
//
// Evaluate once per app session when the first home screen/config is ready.
// Background/foreground, tab changes and config refreshes do not reset it.
// After this startup check, only checkout may show a store-closed notice.

import React from 'react';
import { useStoreConfigStore, useStoreTimings } from '@/src/core/store';
import { logger } from '@/src/base/services/logger';
import { useScreenActive, useScreenFocused } from '@/src/shared/hooks/useScreenActive';
import {
  getStoreStatus,
  needsStoreClosedNotice,
  type StoreStatus,
} from '../domain/storeStatus';

// Module-scoped: HomeScreen remounting (tab resets, navigation) is not an app open.
let checkedThisSession = false;

export function useStoreClosedOnOpen(readyToPresent = true) {
  const focused = useScreenFocused();
  const active = useScreenActive();
  const timings = useStoreTimings();
  const configStatus = useStoreConfigStore((s) => s.status);
  const [status, setStatus] = React.useState<StoreStatus>({ kind: 'unknown' });
  const [visible, setVisible] = React.useState(false);

  const evaluate = React.useCallback(() => {
    if (!active || !readyToPresent) return;
    // Wait for the fetch to settle; a failed one yields no timings, so no sheet.
    if (checkedThisSession || (configStatus !== 'ready' && configStatus !== 'error')) return;
    const next = getStoreStatus(timings);
    logger.debug('[StoreClosedSheet] home check', { configStatus, hasTimings: !!timings, status: next.kind });
    checkedThisSession = true;
    if (!needsStoreClosedNotice(next)) return;
    setStatus(next);
    setVisible(true);
  }, [timings, configStatus, active, readyToPresent]);

  React.useEffect(evaluate, [evaluate]);

  React.useEffect(() => {
    if (!focused) setVisible(false);
  }, [focused]);

  return { visible, status, timings, close: () => setVisible(false) };
}
