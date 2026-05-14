import { useMemo, useState } from 'react';
import { Product } from '@/src/base/types/village.types';
import { useVillageStore } from '@/src/core/store';
import { CATEGORIES, ALL_PRODUCTS, HERO_SLIDES } from '@/src/features/home/data/static/villageData';

export const useHomeViewModel = () => {
  const cart = useVillageStore(state => state.cart);
  const favs = useVillageStore(state => state.favs);
  const addToCart = useVillageStore(state => state.addToCart);
  const decFromCart = useVillageStore(state => state.decFromCart);
  const toggleFav = useVillageStore(state => state.toggleFav);
  const cartCount = useVillageStore(state => state.cartCount());

  const [variantProduct, setVariantProduct] = useState<Product | null>(null);

  const topPicks = useMemo(() =>
    [...ALL_PRODUCTS]
      .sort((a, b) => b.rating * b.reviews - a.rating * a.reviews)
      .slice(0, 6),
    []
  );

  const openVariants = (product: Product) => setVariantProduct(product);
  const closeVariants = () => setVariantProduct(null);

  return {
    categories: CATEGORIES,
    heroSlides: HERO_SLIDES,
    topPicks,
    cart,
    favs,
    cartCount,
    variantProduct,
    addToCart,
    decFromCart,
    toggleFav,
    openVariants,
    closeVariants,
  };
};
