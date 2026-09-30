// src/features/home/data/saleProductsApi.ts
//
// Fetches a sale and its products by slug: GET /app/sales/slug/{slug}.
// `x-store-id` is sent explicitly (like categoryProductsApi); `x-branch-id` is
// added centrally by apiClient.

import { apiClient } from '@/src/base/services/remote/apiClient';
import { WebService } from '@/src/base/constants/AppConstants';
import { HomeProduct } from './homeLayout.types';
import { isProductActive, mapProduct } from './homeLayoutMapper';
import { str } from './productMapper';

export interface SaleInfo {
  title: string;
  description?: string;
  imageUrl?: string;
  startsAt?: string;
  endsAt?: string;
}

export interface SaleProductsResult {
  sale: SaleInfo;
  products: HomeProduct[];
}

export async function getSaleBySlug(storeId: string, slug: string, signal?: AbortSignal): Promise<SaleProductsResult> {
  const data = await apiClient.getWithoutAuth<any>(
    `${WebService.villageBaseURL}/app/sales/slug/${encodeURIComponent(slug)}`,
    { headers: { Accept: '*/*', 'x-store-id': storeId }, signal },
  );

  const root = data?.data ?? data;
  const sale = root?.sale ?? {};
  const raw: any[] = Array.isArray(root?.products) ? root.products : [];

  return {
    sale: {
      title: String(sale?.title ?? ''),
      description: str(sale?.description),
      imageUrl: str(sale?.imageUrl),
      startsAt: str(sale?.startsAt),
      endsAt: str(sale?.endsAt),
    },
    products: raw.filter(isProductActive).map(mapProduct),
  };
}
