// src/shared/hooks/useVariantSheet.ts
//
// Owns the variant bottom sheet for a screen: which product it is showing, and
// how that product's variants were obtained.
//
// List responses already carry a product's variants (see homeLayoutMapper), so
// the common path is synchronous — the sheet opens on the same frame as the tap.
// The detail fetch survives only as a fallback for a response that flagged
// multiple variants without sending them.

import { useCallback, useEffect, useRef, useState } from 'react';
import { Product } from '@/src/base/types/village.types';
import { useStoreId } from '@/src/core/utils/getStoreId';
import { getProductDetail } from '@/src/features/product/data/productDetailApi';
import { logger } from '@/src/base/services/logger';
import { useScreenFocused } from './useScreenActive';

export function useVariantSheet() {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const storeId = useStoreId();
  const focused = useScreenFocused();
  const focusedRef = useRef(focused);
  focusedRef.current = focused;
  // Bumped by every open() call (both the sync and fetch paths) and by close(),
  // so a fetch whose response lands after the sheet moved on — reopened for a
  // different product, double-tapped, or dismissed — can tell it's stale and
  // no-op instead of clobbering whatever is showing now. Whoever bumps this ref
  // takes ownership of `loading`/`error` for the request it starts, so both the
  // fast path and close() clear them immediately rather than leaving a
  // superseded fetch's own (skipped) `finally` as the only place that would.
  const requestId = useRef(0);
  const pending = useRef<AbortController | null>(null);

  const close = useCallback(() => {
    requestId.current++;
    pending.current?.abort();
    pending.current = null;
    setProduct(null);
    setLoading(false);
    setError(null);
  }, []);

  useEffect(() => {
    if (!focused) close();
  }, [focused, close]);
  useEffect(() => {
    close();
  }, [storeId, close]);
  useEffect(() => () => {
    requestId.current++;
    pending.current?.abort();
    pending.current = null;
  }, []);

  const open = useCallback(
    async (candidate: Product) => {
      if (!focusedRef.current) return;
      const id = ++requestId.current;
      pending.current?.abort();
      pending.current = null;
      setError(null);

      if (candidate.variants?.length) {
        setProduct(candidate);
        setLoading(false);
        return;
      }

      const controller = new AbortController();
      pending.current = controller;
      setLoading(true);
      try {
        const full = await getProductDetail(storeId, candidate.id, controller.signal);
        if (requestId.current !== id) return;
        if (!full.variants?.length) {
          logger.error('Product detail returned no variants', candidate.id);
          setError(new Error('This product has no variants to show.'));
          return;
        }
        setProduct({
          ...candidate,
          name: full.title,
          nameTE: full.teluguTitle || '',
          price: full.price,
          mrp: full.mrp,
          image: full.image,
          variants: full.variants,
        });
      } catch (err) {
        if (requestId.current !== id) return;
        logger.error('Failed to load product variants:', err);
        setError(err instanceof Error ? err : new Error('Failed to load product variants.'));
      } finally {
        if (requestId.current === id) {
          pending.current = null;
          setLoading(false);
        }
      }
    },
    [storeId],
  );

  return { product, loading, error, open, close };
}
