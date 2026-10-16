import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/src/base/query/queryKeys';
import { ALL_PRODUCTS } from '@/src/features/home/data/static/villageData';
import { getAllProducts } from '../productsApi';
import { useStoreId } from '@/src/core/utils/getStoreId';

// Fallback to static data when API is not available or returns empty
const fetchProducts = async (storeId: string, signal: AbortSignal) => {
  try {
    const products = await getAllProducts(storeId, signal);
    return products.length > 0 ? products : ALL_PRODUCTS;
  } catch (error) {
    if (signal.aborted) throw error;
    return ALL_PRODUCTS;
  }
};

export const useProductsQuery = () => {
  const storeId = useStoreId();

  return useQuery({
    queryKey: [...queryKeys.products.list(), { storeId }],
    queryFn: ({ signal }) => fetchProducts(storeId, signal),
    enabled: !!storeId,
    staleTime: Infinity,
  });
};
