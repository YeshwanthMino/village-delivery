import { useMemo, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Product, SortKey } from '@/src/base/types/village.types';
import { useVillageStore } from '@/src/core/store';
import {
  CATEGORIES,
  getProducts,
  sortProducts,
} from '@/src/features/home/data/static/villageData';

const HERO_GRADIENTS: Record<string, { from: string; to: string }> = {
  fruits:     { from: 'from-red-400',    to: 'to-rose-500' },
  vegetables: { from: 'from-green-500',  to: 'to-emerald-600' },
  dairy:      { from: 'from-sky-400',    to: 'to-blue-500' },
  snacks:     { from: 'from-amber-400',  to: 'to-orange-500' },
  beverages:  { from: 'from-orange-400', to: 'to-amber-500' },
  bakery:     { from: 'from-yellow-400', to: 'to-amber-500' },
  meat:       { from: 'from-rose-400',   to: 'to-red-500' },
  frozen:     { from: 'from-cyan-400',   to: 'to-sky-500' },
  organic:    { from: 'from-lime-400',   to: 'to-green-500' },
  pantry:     { from: 'from-stone-400',  to: 'to-amber-600' },
};

export const useCategoryDetailsViewModel = () => {
  const { categoryId } = useLocalSearchParams<{ categoryId: string }>();
  const cartCount = useVillageStore(state => state.cartCount());

  const [sortKey, setSortKey] = useState<SortKey>('popular');
  const [sortSheetVisible, setSortSheetVisible] = useState(false);
  const [variantProduct, setVariantProduct] = useState<Product | null>(null);

  const currentCategory = useMemo(
    () => CATEGORIES.find(c => c.id === categoryId) ?? null,
    [categoryId]
  );

  const products = useMemo(() => {
    if (!categoryId) return [];
    return sortProducts(getProducts(categoryId), sortKey);
  }, [categoryId, sortKey]);

  const heroGradient = categoryId ? (HERO_GRADIENTS[categoryId] ?? null) : null;

  return {
    categoryId,
    currentCategory,
    products,
    heroGradient,
    sortKey,
    setSortKey,
    cartCount,
    variantProduct,
    sortSheetVisible,
    openVariants: (product: Product) => setVariantProduct(product),
    closeVariants: () => setVariantProduct(null),
    openSortSheet: () => setSortSheetVisible(true),
    closeSortSheet: () => setSortSheetVisible(false),
  };
};
