// src/features/home/data/homeLayoutApi.ts
//
// Fetches the dynamic home page-layout for a store.
// Public-ish endpoint keyed by the x-store-id header (the village's storeId
// returned from find-by-location).

import { apiClient } from '@/src/base/services/remote/apiClient';
import { WebService } from '@/src/base/constants/AppConstants';
import { HomeLayout } from './homeLayout.types';
import { mapHomeLayout } from './homeLayoutMapper';

export async function getHomeLayout(
  storeId: string,
  slug = 'app-home-page-layout',
): Promise<HomeLayout> {
  // Fetch the layout directly by slug. Public endpoint keyed by x-store-id;
  // no auth token required.
  const data = await apiClient.getWithoutAuth<any>(
    `${WebService.villageBaseURL}/app/page-layout/slug/${slug}`,
    { headers: { Accept: '*/*', 'x-store-id': storeId } },
  );

  // Endpoint returns a single layout; tolerate common wrappers and a list
  // fallback (selecting by slug) in case the shape differs by environment.
  let layout: any = data?.pageLayout ?? data?.data ?? data ?? null;
  if (Array.isArray(layout?.pageLayouts) || Array.isArray(layout)) {
    const layouts: any[] = Array.isArray(layout) ? layout : layout.pageLayouts;
    layout =
      layouts.find((l) => String(l?.slug ?? '').replace(/^\//, '') === slug) ??
      null;
  }

  return mapHomeLayout(layout ?? {});
}
