// src/core/utils/useTranslation.ts

import { useVillageStore } from '@/src/core/store/useVillageStore';
import { Locale, interpolate, translate } from '@/src/base/constants/translations';

/**
 * Hook: returns t(key) bound to the current locale from the store.
 * Components call this instead of importing translate() directly so they
 * automatically re-render when the locale changes.
 */
export function useTranslation() {
  const locale = useVillageStore((s) => (s as any).locale as Locale ?? 'te');

  function t(key: string): string {
    return translate(key, locale);
  }

  function tEta(minutes: number): string {
    return interpolate(translate('delivery_eta', locale), minutes);
  }

  function tItemCount(count: number): string {
    return interpolate(translate('item_count', locale), count);
  }

  function tDiscount(pct: number): string {
    return interpolate(translate('discount_badge', locale), pct);
  }

  return { t, tEta, tItemCount, tDiscount, locale };
}

/**
 * Converts a weight string like "500 g", "1 Kg", "250ml" into the
 * locale-appropriate form. English: pass through. Telugu: replace suffix.
 */
export function localizeWeight(weight: string, locale: Locale): string {
  if (locale === 'en') return weight;

  return weight
    .replace(/\s*(kg|Kg|KG)\s*/i, ' కిలో')
    .replace(/\s*(ml|mL|ML)\s*/i, ' మి.లీ')
    .replace(/\s*(g|G)\s*$/i, ' గ్రాములు');
}
