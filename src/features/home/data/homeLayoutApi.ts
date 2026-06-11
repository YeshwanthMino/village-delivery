// src/features/home/data/homeLayoutApi.ts
//
// Fetches the dynamic home page-layout for a store.
// Public-ish endpoint keyed by the x-store-id header (the village's storeId
// returned from find-by-location).

import { apiClient } from '@/src/base/services/remote/apiClient';
import { WebService } from '@/src/base/constants/AppConstants';
import { HomeLayout } from './homeLayout.types';
import { mapHomeLayout } from './homeLayoutMapper';

export async function getHomeLayout(storeId: string, path = 'main'): Promise<HomeLayout> {
  // Public endpoint keyed by x-store-id; no auth token required.
  const data = await apiClient.getWithoutAuth<any>(
    `${WebService.villageBaseURL}/app/page-layout/path/${path}`,
    { headers: { Accept: '*/*', 'x-store-id': storeId } },
  );
  return mapHomeLayout(data);
}
