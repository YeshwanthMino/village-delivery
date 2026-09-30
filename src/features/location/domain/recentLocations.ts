import type { RecentLocation, Village } from './models';

export function usableVillageId(value?: string): string | undefined {
  const id = value?.trim();
  if (!id || id.toLowerCase() === 'unknown' || id === '[object Object]') return undefined;
  return id;
}

function normalizeName(value?: string): string {
  return (value ?? '').trim().replace(/\s+/g, ' ').toLocaleLowerCase();
}

export function normalizeRecentLocation(recent: RecentLocation): RecentLocation {
  const villageId = usableVillageId(recent.villageId);
  return villageId ? { ...recent, villageId } : { ...recent, villageId: undefined };
}

export function sameRecentLocation(a: RecentLocation, b: RecentLocation): boolean {
  const aVillageId = usableVillageId(a.villageId);
  const bVillageId = usableVillageId(b.villageId);
  if (aVillageId && bVillageId) return aVillageId === bVillageId;

  // Missing/legacy IDs must not collapse every village into one placeholder.
  const aName = normalizeName(a.villageName);
  const bName = normalizeName(b.villageName);
  if (aName && bName) return a.storeId === b.storeId && aName === bName;
  return normalizeName(a.label) === normalizeName(b.label);
}

export function recentLocationKey(recent: RecentLocation): string {
  const villageId = usableVillageId(recent.villageId);
  if (villageId) return `village:${villageId}`;
  return `location:${recent.storeId}:${normalizeName(recent.villageName || recent.label)}`;
}

export function isActiveRecentLocation(recent: RecentLocation, village: Village | null): boolean {
  if (!village) return false;
  const recentId = usableVillageId(recent.villageId);
  const activeId = usableVillageId(village.id);
  if (recentId && activeId) return recentId === activeId;
  return recent.storeId === village.storeId
    && normalizeName(recent.villageName) === normalizeName(village.name);
}
