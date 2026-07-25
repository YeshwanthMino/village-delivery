// src/shared/hooks/useVariantSheet.ts
//
// Owns the variant bottom sheet for a screen: which product it is showing, and
// how that product's variants were obtained.
//
// List responses already carry a product's variants (see homeLayoutMapper), so
// the common path is synchronous — the sheet opens on the same frame as the tap.
// The detail fetch survives only as a fallback for a response that flagged
// multiple variants without sending them.

import { useCallback, useRef, useState } from 'react';
import { Product } from '@/src/base/types/village.types';
import { useStoreId } from '@/src/core/utils/getStoreId';
import { getProductDetail } from '@/src/features/product/data/productDetailApi';
import { logger } from '@/src/base/services/logger';

export function useVariantSheet() {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const storeId = useStoreId();
  // Bumped by every open() call (both the sync and fetch paths) and by close(),
  // so a fetch whose response lands after the sheet moved on — reopened for a
  // different product, double-tapped, or dismissed — can tell it's stale and
  // no-op instead of clobbering whatever is showing now.
  const requestId = useRef(0);

  const open = useCallback(
    async (candidate: Product) => {
      const id = ++requestId.current;
      setError(null);

      if (candidate.variants?.length) {
        setProduct(candidate);
        return;
      }

      setLoading(true);
      try {
        const full = await getProductDetail(storeId, candidate.id);
        if (requestId.current !== id) return;
        if (!full.variants?.length) {
          logger.error('Product detail returned no variants', candidate.id);
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
      } catch (error) {
        if (requestId.current !== id) return;
        logger.error('Failed to load product variants:', error);
        setError(error);
      } finally {
        if (requestId.current === id) setLoading(false);
      }
    },
    [storeId],
  );

  const close = useCallback(() => {
    requestId.current++;
    setProduct(null);
  }, []);

  return { product, loading, error, open, close };
}
