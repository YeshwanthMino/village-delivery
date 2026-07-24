import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/src/base/query/queryKeys';
import { ALL_PRODUCTS } from '../static/villageData';
import { getAllProducts } from '../productsApi';
import { useStoreId } from '@/src/core/utils/getStoreId';

// Fallback to static data when API is not available or returns empty
const fetchProducts = async (storeId: string) => {
  try {
    const products = await getAllProducts(storeId);
    return products.length > 0 ? products : ALL_PRODUCTS;
  } catch {
    return ALL_PRODUCTS;
  }
};

export const useProductsQuery = () => {
  const storeId = useStoreId();

  return useQuery({
    queryKey: queryKeys.products.list(),
    queryFn: () => fetchProducts(storeId),
    staleTime: Infinity,
  });
};
