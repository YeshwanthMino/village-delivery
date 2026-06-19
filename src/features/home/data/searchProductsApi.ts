// src/features/home/data/searchProductsApi.ts
//
// Full-text product search via the /app/product endpoint. Public-ish endpoint
// keyed by the x-store-id header. Mirrors categoryProductsApi shape.

import { apiClient } from '@/src/base/services/remote/apiClient';
import { WebService } from '@/src/base/constants/AppConstants';
import { HomeProduct } from './homeLayout.types';
import { mapProduct } from './homeLayoutMapper';

export interface SearchProductsResult {
  products: HomeProduct[];
  total: number;
}

export async function searchProducts(
  storeId: string,
  term: string,
  opts: { categoryId?: string; skip?: number; limit?: number } = {},
): Promise<SearchProductsResult> {
  const { categoryId, skip = 0, limit = 24 } = opts;

  const query = new URLSearchParams({
    sort: '_id:desc',
    skip: String(skip),
    limit: String(limit),
  });
  const trimmed = term.trim();
  if (trimmed) query.set('search', trimmed);
  if (categoryId) query.set('categoryId', categoryId);

  const data = await apiClient.getWithoutAuth<any>(
    `${WebService.villageBaseURL}/app/product?${query.toString()}`,
    { headers: { Accept: '*/*', 'x-store-id': storeId } },
  );

  const rawProducts: any[] = Array.isArray(data?.products) ? data.products : [];
  const products = rawProducts.map((p) => {
    const mapped = mapProduct(p);
    // Payload omits `stock`; treat absent stock as in-stock.
    return p?.stock === undefined ? { ...mapped, inStock: true } : mapped;
  });

  const meta = Array.isArray(data?.results) ? data.results[0] : undefined;
  return {
    products,
    total: typeof meta?.count === 'number' ? meta.count : products.length,
  };
}
