import { useMemo, useState } from 'react';
import { Product } from '@/src/base/types/village.types';
import { useVillageStore } from '@/src/core/store';
import {
  CATEGORIES,
  ALL_PRODUCTS,
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

export const useCategoriesViewModel = () => {
  const selectedCat = useVillageStore(state => state.selectedCat);
  const sortKey = useVillageStore(state => state.sortKey);
  const cart = useVillageStore(state => state.cart);
  const favs = useVillageStore(state => state.favs);
  const setSelectedCat = useVillageStore(state => state.setSelectedCat);
  const setSortKey = useVillageStore(state => state.setSortKey);
  const addToCart = useVillageStore(state => state.addToCart);
  const decFromCart = useVillageStore(state => state.decFromCart);
  const toggleFav = useVillageStore(state => state.toggleFav);
  const cartCount = useVillageStore(state => state.cartCount());

  const [variantProduct, setVariantProduct] = useState<Product | null>(null);
  const [sortSheetVisible, setSortSheetVisible] = useState(false);

  const currentCategory = selectedCat ? CATEGORIES.find(c => c.id === selectedCat) : null;

  const products = useMemo(() => {
    if (!selectedCat) return [];
    return sortProducts(getProducts(selectedCat), sortKey);
  }, [selectedCat, sortKey]);

  const heroGradient = selectedCat ? HERO_GRADIENTS[selectedCat] : null;

  const openVariants = (product: Product) => setVariantProduct(product);
  const closeVariants = () => setVariantProduct(null);

  return {
    categories: CATEGORIES,
    selectedCat,
    currentCategory,
    products,
    heroGradient,
    sortKey,
    cart,
    favs,
    cartCount,
    variantProduct,
    sortSheetVisible,
    setSelectedCat,
    setSortKey,
    addToCart,
    decFromCart,
    toggleFav,
    openVariants,
    closeVariants,
    openSortSheet: () => setSortSheetVisible(true),
    closeSortSheet: () => setSortSheetVisible(false),
    productCountInCat: (catId: string) => ALL_PRODUCTS.filter(p => p.categoryId === catId).length,
  };
};
