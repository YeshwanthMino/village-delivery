// src/features/home/data/productsApi.ts
//
// Fetch products with variants (full Product interface).
// Maps backend variantIds to Product.variants at the DTO layer.

import { Product } from '@/src/base/types/village.types';
import { apiClient } from '@/src/base/services/remote/apiClient';
import { WebService } from '@/src/base/constants/AppConstants';
import { mapProductWithVariants, isProductActive } from './homeLayoutMapper';

/**
 * Fetch all products for a store. Each product includes variants
 * extracted from variantIds. Returns empty array on failure.
 */
export async function getAllProducts(storeId: string): Promise<Product[]> {
  const data = await apiClient.getWithoutAuth<any>(
    `${WebService.villageBaseURL}/app/products`,
    { headers: { Accept: '*/*', 'x-store-id': storeId } },
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
    `${WebService.villageBaseURL}/app/product/${id}`,
    { headers: { Accept: '*/*', 'x-store-id': storeId } },
  );

  if (!isProductActive(data)) return null;
  return mapProductWithVariants(data);
}
