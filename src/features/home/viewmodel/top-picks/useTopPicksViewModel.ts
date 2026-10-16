import { useMemo, useState } from 'react';
import { Product, SortKey } from '@/src/base/types/village.types';
import { useVillageStore, selectCartCount } from '@/src/core/store';
import { sortProducts } from '@/src/features/home/data/static/villageData';
import { useProductsQuery } from '@/src/features/home/data/queries/useProductsQuery';
import type { AnalyticsProductContext } from '@/src/base/services/analytics';

export const useTopPicksViewModel = () => {
  const cartCount = useVillageStore(selectCartCount);
  const { data: allProducts = [] } = useProductsQuery();

  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('popular');
  const [sortSheetVisible, setSortSheetVisible] = useState(false);
  const [variantProduct, setVariantProduct] = useState<Product | null>(null);
  const [variantContext, setVariantContext] = useState<AnalyticsProductContext | undefined>();

  const products = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const base = query
      ? allProducts.filter(
          p => p.name.toLowerCase().includes(query) || p.nameTE.toLowerCase().includes(query)
        )
      : allProducts;
    return sortProducts(base, sortKey);
  }, [allProducts, searchQuery, sortKey]);

  return {
    searchQuery,
    setSearchQuery,
    sortKey,
    setSortKey,
    products,
    cartCount,
    variantProduct,
    variantContext,
    sortSheetVisible,
    openVariants: (product: Product, context?: AnalyticsProductContext) => { setVariantProduct(product); setVariantContext(context); },
    closeVariants: () => { setVariantProduct(null); setVariantContext(undefined); },
    openSortSheet: () => setSortSheetVisible(true),
    closeSortSheet: () => setSortSheetVisible(false),
  };
};
