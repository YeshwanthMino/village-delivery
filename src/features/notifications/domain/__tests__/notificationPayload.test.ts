import { parseNotificationPayload } from '../notificationPayload';

describe('parseNotificationPayload', () => {
  it('extracts a string route', () => {
    expect(parseNotificationPayload({ route: '/order-detail?orderId=1' }))
      .toEqual({ route: '/order-detail?orderId=1' });
  });

  it('ignores unrelated fields on the payload', () => {
    expect(parseNotificationPayload({ route: '/cart', orderId: '1', title: 'Hi' }))
      .toEqual({ route: '/cart' });
  });

  it('returns an empty object when route is missing', () => {
    expect(parseNotificationPayload({})).toEqual({});
    expect(parseNotificationPayload({ orderId: '1' })).toEqual({});
  });

  it('returns an empty object when data is null or undefined', () => {
    expect(parseNotificationPayload(null)).toEqual({});
    expect(parseNotificationPayload(undefined)).toEqual({});
  });

  it('returns an empty object when data is not an object', () => {
    expect(parseNotificationPayload('/cart')).toEqual({});
    expect(parseNotificationPayload(42)).toEqual({});
  });

  it('returns an empty object when route is not a string', () => {
    expect(parseNotificationPayload({ route: 123 })).toEqual({});
    expect(parseNotificationPayload({ route: { path: '/cart' } })).toEqual({});
    expect(parseNotificationPayload({ route: null })).toEqual({});
  });
});
