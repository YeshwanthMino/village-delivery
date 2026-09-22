import { NOTIFICATION_FALLBACK_ROUTE, resolveNotificationRoute } from '../handleNotificationResponse';

describe('resolveNotificationRoute', () => {
  it('navigates to an allowlisted route with its query string intact', () => {
    expect(resolveNotificationRoute({ route: '/order-detail?orderId=123' }))
      .toBe('/order-detail?orderId=123');
  });

  it('navigates to an allowlisted group route', () => {
    expect(resolveNotificationRoute({ route: '/(dashboard)/home' }))
      .toBe('/(dashboard)/home');
  });

  it('falls back to home for an unknown route', () => {
    expect(resolveNotificationRoute({ route: '/not-a-real-route' }))
      .toBe(NOTIFICATION_FALLBACK_ROUTE);
  });

  it('falls back to home when the payload has no route', () => {
    expect(resolveNotificationRoute({})).toBe(NOTIFICATION_FALLBACK_ROUTE);
  });

  it('falls back to home when data is null or undefined', () => {
    expect(resolveNotificationRoute(null)).toBe(NOTIFICATION_FALLBACK_ROUTE);
    expect(resolveNotificationRoute(undefined)).toBe(NOTIFICATION_FALLBACK_ROUTE);
  });

  it('falls back to home when route is not a string', () => {
    expect(resolveNotificationRoute({ route: 123 })).toBe(NOTIFICATION_FALLBACK_ROUTE);
  });
});
