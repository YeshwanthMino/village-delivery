// src/features/home/data/homeLayoutApi.ts
//
// Fetches the dynamic home page-layout for a store.
// Public-ish endpoint keyed by the x-store-id header (the village's storeId
// returned from find-by-location).

import axios from 'axios';
import { WebService } from '@/src/base/constants/AppConstants';
import { HomeLayout } from './homeLayout.types';
import { mapHomeLayout } from './homeLayoutMapper';

export async function getHomeLayout(storeId: string, path = 'main'): Promise<HomeLayout> {
  const res = await axios.get(`${WebService.villageBaseURL}/app/page-layout/path/${path}`, {
    headers: { Accept: '*/*', 'x-store-id': storeId },
    timeout: 20000,
  });
  return mapHomeLayout(res.data);
}
