import { useVillageStore } from '@/src/core/store';
import { useCategoriesQuery } from '@/src/features/home/data/queries/useCategoriesQuery';
import { useProductsQuery } from '@/src/features/home/data/queries/useProductsQuery';

export const useCategoriesViewModel = () => {
  const cartCount = useVillageStore(state => state.cartCount());
  const { data: categories = [] } = useCategoriesQuery();
  const { data: products = [] } = useProductsQuery();

  return {
    categories,
    cartCount,
    productCountInCat: (catId: string) => products.filter(p => p.categoryId === catId).length,
  };
};
