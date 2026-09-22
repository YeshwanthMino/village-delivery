// Root-level route segments the app's Stack navigator actually renders
// (app/_layout.tsx's <Stack.Screen> list). Shared between AppScreen (bouncing
// an unknown root to home on launch) and the push notification tap handler
// (validating a payload's route before navigating).

export const KNOWN_ROOT_ROUTES = [
  '(dashboard)', 'auth', 'search', 'location', 'address',
  'category-details', 'cart', 'top-picks', 'order-detail',
  'product', 'about',
] as const;

/** Extracts the root segment: "/order-detail?orderId=1" -> "order-detail". */
export function rootSegment(path: string): string {
  const withoutQuery = path.split('?')[0];
  const segments = withoutQuery.split('/').filter(Boolean);
  return segments[0] ?? '';
}

export function isKnownRoute(path: string): boolean {
  const root = rootSegment(path);
  return (KNOWN_ROOT_ROUTES as readonly string[]).includes(root);
}
