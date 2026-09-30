// src/features/home/data/productsApi.ts
//
// Fetch products with variants (full Product interface).
// Maps the backend's variants (or legacy variantIds) to Product.variants.

import { Product } from '@/src/base/types/village.types';
import { apiClient } from '@/src/base/services/remote/apiClient';
import { WebService } from '@/src/base/constants/AppConstants';
import { mapProductWithVariants, isProductActive } from './homeLayoutMapper';

/**
 * Fetch all products for a store. Each product includes variants
 * extracted from variants (or legacy variantIds). Returns empty array on failure.
 */
export async function getAllProducts(storeId: string, signal?: AbortSignal): Promise<Product[]> {
  const data = await apiClient.getWithoutAuth<any>(
    `${WebService.villageBaseURL}/app/products`,
    { headers: { Accept: '*/*', 'x-store-id': storeId }, signal },
  );

  const rawProducts: any[] = Array.isArray(data?.products) ? data.products : [];
  return rawProducts
    .filter(isProductActive)
    .map(mapProductWithVariants);
}

/**
 * Fetch a single product by ID with variants mapped.
 */
export async function getProductById(storeId: string, id: string): Promise<Product | null> {
  const data = await apiClient.getWithoutAuth<any>(
    `${WebService.villageBaseURL}/app/products/${id}`,
    { headers: { Accept: '*/*', 'x-store-id': storeId } },
  );

  if (!isProductActive(data)) return null;
  return mapProductWithVariants(data);
}
