// src/features/home/data/categoryProductsApi.ts
//
// Fetches the product list for a single (sub-)category via the flattened
// all-products endpoint. Public-ish endpoint keyed by the x-store-id header.

import { apiClient } from '@/src/base/services/remote/apiClient';
import { WebService } from '@/src/base/constants/AppConstants';
import { HomeProduct } from './homeLayout.types';
import { mapProduct } from './homeLayoutMapper';

export interface CategoryProductsResult {
  products: HomeProduct[];
  total: number;
  name: string;
}

export async function getCategoryProducts(
  storeId: string,
  categoryId: string,
  skip = 0,
  limit = 24,
): Promise<CategoryProductsResult> {
  const data = await apiClient.getWithoutAuth<any>(
    `${WebService.villageBaseURL}/app/category/flattened/all-products/${categoryId}?skip=${skip}&limit=${limit}`,
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
    name: String(meta?.name ?? ''),
  };
}
