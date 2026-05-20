import { useMemo, useState } from 'react';
import { Product, SortKey } from '@/src/base/types/village.types';
import { useVillageStore } from '@/src/core/store';
import { sortProducts } from '@/src/features/home/data/static/villageData';
import { useProductsQuery } from '@/src/features/home/data/queries/useProductsQuery';

export const useTopPicksViewModel = () => {
  const cartCount = useVillageStore(state => state.cartCount());
  const { data: allProducts = [] } = useProductsQuery();

  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('popular');
  const [sortSheetVisible, setSortSheetVisible] = useState(false);
  const [variantProduct, setVariantProduct] = useState<Product | null>(null);

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
    sortSheetVisible,
    openVariants: (product: Product) => setVariantProduct(product),
    closeVariants: () => setVariantProduct(null),
    openSortSheet: () => setSortSheetVisible(true),
    closeSortSheet: () => setSortSheetVisible(false),
  };
};
