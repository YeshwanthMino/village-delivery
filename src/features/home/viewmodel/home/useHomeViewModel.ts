import { useMemo, useState } from 'react';
import { Product } from '@/src/base/types/village.types';
import { useVillageStore } from '@/src/core/store';
import { useProductsQuery } from '@/src/features/home/data/queries/useProductsQuery';
import { useCategoriesQuery } from '@/src/features/home/data/queries/useCategoriesQuery';
import { useHeroSlidesQuery } from '@/src/features/home/data/queries/useHeroSlidesQuery';

export const useHomeViewModel = () => {
  const cart = useVillageStore(state => state.cart);
  const favs = useVillageStore(state => state.favs);
  const addToCart = useVillageStore(state => state.addToCart);
  const decFromCart = useVillageStore(state => state.decFromCart);
  const toggleFav = useVillageStore(state => state.toggleFav);
  const cartCount = useVillageStore(state => state.cartCount());

  const { data: products = [] } = useProductsQuery();
  const { data: categories = [] } = useCategoriesQuery();
  const { data: heroSlides = [] } = useHeroSlidesQuery();

  const [variantProduct, setVariantProduct] = useState<Product | null>(null);

  const topPicks = useMemo(() =>
    [...products]
      .sort((a, b) => b.rating * b.reviews - a.rating * a.reviews)
      .slice(0, 6),
    [products]
  );

  return {
    categories,
    heroSlides,
    topPicks,
    cart,
    favs,
    cartCount,
    variantProduct,
    addToCart,
    decFromCart,
    toggleFav,
    openVariants: (product: Product) => setVariantProduct(product),
    closeVariants: () => setVariantProduct(null),
  };
};
