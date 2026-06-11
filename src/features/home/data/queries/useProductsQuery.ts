import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/src/base/query/queryKeys';
import { ALL_PRODUCTS } from '../static/villageData';

// queryFn body swaps to: apiClient.get(`${WebService.villageService}v1/products`)
const fetchProducts = async () => ALL_PRODUCTS;

export const useProductsQuery = () =>
  useQuery({
    queryKey: queryKeys.products.list(),
    queryFn: fetchProducts,
    staleTime: Infinity,
  });
