import { useLocalSearchParams } from 'expo-router';
import { useVillageStore, selectCartCount } from '@/src/core/store';
import { useSaleProductsQuery } from '@/src/features/home/data/queries/useSaleProductsQuery';

export const useSaleProductListViewModel = () => {
  const params = useLocalSearchParams<{ slug?: string | string[] }>();
  // expo-router can hand back an array for repeated params; take the first.
  const rawSlug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
  const slug = rawSlug?.trim() || undefined;

  const cartCount = useVillageStore(selectCartCount);
  const query = useSaleProductsQuery(slug);

  return {
    slug,
    sale: query.data?.sale,
    title: query.data?.sale.title ?? '',
    products: query.data?.products ?? [],
    loading: !!slug && query.isLoading,
    error: !slug || query.isError,
    refetch: query.refetch,
    cartCount,
  };
};
