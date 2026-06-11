import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/src/base/query/queryKeys';
import { HERO_SLIDES } from '../static/villageData';

// queryFn body swaps to: apiClient.get(`${WebService.villageService}v1/hero-slides`)
const fetchHeroSlides = async () => HERO_SLIDES;

export const useHeroSlidesQuery = () =>
  useQuery({
    queryKey: queryKeys.heroSlides.all,
    queryFn: fetchHeroSlides,
    staleTime: Infinity,
  });
