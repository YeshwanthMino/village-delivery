// src/shared/hooks/useVariantSheet.ts
//
// Owns the variant bottom sheet for a screen: which product it is showing, and
// how that product's variants were obtained.
//
// List responses already carry a product's variants (see homeLayoutMapper), so
// the common path is synchronous — the sheet opens on the same frame as the tap.
// The detail fetch survives only as a fallback for a response that flagged
// multiple variants without sending them.

import { useCallback, useState } from 'react';
import { Product } from '@/src/base/types/village.types';
import { useStoreId } from '@/src/core/utils/getStoreId';
import { getProductDetail } from '@/src/features/product/data/productDetailApi';
import { logger } from '@/src/base/services/logger';

export function useVariantSheet() {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const storeId = useStoreId();

  const open = useCallback(
    async (candidate: Product) => {
      if (candidate.variants?.length) {
        setProduct(candidate);
        return;
      }

      setLoading(true);
      try {
        const full = await getProductDetail(storeId, candidate.id);
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
        logger.error('Failed to load product variants:', error);
      } finally {
        setLoading(false);
      }
    },
    [storeId],
  );

  const close = useCallback(() => setProduct(null), []);

  return { product, loading, open, close };
}
