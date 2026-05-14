import { useVillageStore } from '@/src/core/store';
import { ALL_PRODUCTS, CATEGORIES } from '@/src/features/home/data/static/villageData';

export const useCategoriesViewModel = () => {
  const cartCount = useVillageStore(state => state.cartCount());

  return {
    categories: CATEGORIES,
    cartCount,
    productCountInCat: (catId: string) => ALL_PRODUCTS.filter(p => p.categoryId === catId).length,
  };
};
