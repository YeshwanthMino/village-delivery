import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/src/base/query/queryKeys';
import { CATEGORIES } from '../static/villageData';

// queryFn body swaps to: apiClient.get(`${WebService.villageService}v1/categories`)
const fetchCategories = async () => CATEGORIES;

export const useCategoriesQuery = () =>
  useQuery({
    queryKey: queryKeys.categories.list(),
    queryFn: fetchCategories,
    staleTime: Infinity,
  });
