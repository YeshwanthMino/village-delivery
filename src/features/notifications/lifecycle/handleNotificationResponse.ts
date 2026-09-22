// Pure decision: given a tapped notification's data payload, which in-app
// route to open. Always resolves to a valid route — a missing or unroutable
// payload falls back to home rather than leaving the tap silently ignored.
// The router-calling wrapper below is thin glue kept separate so the decision
// logic itself needs no expo-router/expo-notifications mocking to test.

import type { NotificationResponse } from 'expo-notifications';
import { isKnownRoute } from '@/src/features/initialization/domain/knownRoutes';
import { parseNotificationPayload } from '../domain/notificationPayload';

export const NOTIFICATION_FALLBACK_ROUTE = '/(dashboard)/home';

export function resolveNotificationRoute(data: unknown): string {
  const { route } = parseNotificationPayload(data);
  if (route && isKnownRoute(route)) return route;
  return NOTIFICATION_FALLBACK_ROUTE;
}

// `href: any` deliberately widens past expo-router's typed-routes `Href` union —
// a notification payload's route is a runtime string, not statically knowable,
// same reasoning as the existing `pathname: pathname as any` cast in
// app/onboarding/language.tsx's deferred-deep-link handler.
export function handleNotificationResponse(
  response: NotificationResponse,
  router: { push: (href: any) => void },
): void {
  const path = resolveNotificationRoute(response.notification.request.content.data);
  router.push(path);
}
