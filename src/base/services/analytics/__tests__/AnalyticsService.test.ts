import { AnalyticsService } from '../AnalyticsService';
import type { AnalyticsProvider } from '../AnalyticsProvider';

function provider(): jest.Mocked<AnalyticsProvider> {
  return {
    track: jest.fn(),
    identify: jest.fn(),
    setUserProperties: jest.fn(),
    reset: jest.fn(),
  };
}

describe('AnalyticsService', () => {
  it('keeps provider calls in order across asynchronous identity changes', async () => {
    const sink = provider();
    const delivered: string[] = [];
    sink.track.mockImplementation(async (name) => { delivered.push(name); });
    sink.identify.mockImplementation(async (id) => { delivered.push(`identify:${id}`); });
    sink.reset.mockImplementation(async () => { delivered.push('reset'); });
    const analytics = new AnalyticsService(sink);

    analytics.identify('user-1');
    analytics.track('order_placed', { order_id: 'order-1' });
    analytics.track('logout_completed', { reason: 'user' });
    analytics.reset();
    await analytics.flush();

    expect(delivered).toEqual([
      'identify:user-1',
      'order_placed',
      'logout_completed',
      'reset',
    ]);
  });

  it('sends only allowlisted scalar event and user properties', async () => {
    const sink = provider();
    const analytics = new AnalyticsService(sink);

    analytics.track('search_performed', {
      query_length: 7,
      result_count: Number.NaN,
      phone_number: '9999999999',
      address: { street: 'private' },
    } as never);
    analytics.setUserProperties({
      locale: 'en',
      is_vip: true,
      phone_number: '9999999999',
    } as never);
    await analytics.flush();

    expect(sink.track).toHaveBeenCalledWith('search_performed', { query_length: 7 });
    expect(sink.setUserProperties).toHaveBeenCalledWith({ locale: 'en', is_vip: 'true' });
  });

  it('passes checkout preference events through the vendor-neutral API', async () => {
    const sink = provider();
    const analytics = new AnalyticsService(sink);

    analytics.track('payment_method_selected', { payment_method: 'upi' });
    analytics.track('wallet_application_changed', { applied: false });
    await analytics.flush();

    expect(sink.track).toHaveBeenNthCalledWith(1, 'payment_method_selected', { payment_method: 'upi' });
    expect(sink.track).toHaveBeenNthCalledWith(2, 'wallet_application_changed', { applied: false });
  });

  it('retains purchased item IDs and quantity while dropping other fields', async () => {
    const sink = provider();
    const analytics = new AnalyticsService(sink);

    analytics.track('product_purchased', {
      order_id: 'order-1',
      product_id: 'product-1',
      variant_id: 'variant-1',
      quantity: 2,
      customer_phone: '9999999999',
    } as never);
    await analytics.flush();

    expect(sink.track).toHaveBeenCalledWith('product_purchased', {
      order_id: 'order-1',
      product_id: 'product-1',
      variant_id: 'variant-1',
      quantity: 2,
    });
  });

  it('passes recommendation placement without accepting customer data', async () => {
    const sink = provider();
    const analytics = new AnalyticsService(sink);
    analytics.track('product_impression', {
      product_id: 'p1', list_id: 'similar:p0', source: 'similar_products', position: 2,
      recommendation_id: 'rec-1', model_version: 'v3', customer_email: 'private@example.com',
    } as never);
    await analytics.flush();
    expect(sink.track).toHaveBeenCalledWith('product_impression', {
      product_id: 'p1', list_id: 'similar:p0', source: 'similar_products', position: 2,
      recommendation_id: 'rec-1', model_version: 'v3',
    });
  });

  it('continues after a provider rejection and never rejects the UI call', async () => {
    const sink = provider();
    sink.track.mockRejectedValueOnce(new Error('native module unavailable'));
    const analytics = new AnalyticsService(sink);

    expect(() => {
      analytics.track('app_screen_view', { screen_name: 'home' });
      analytics.track('category_viewed', { category_id: 'cat-1' });
    }).not.toThrow();
    await expect(analytics.flush()).resolves.toBeUndefined();
    expect(sink.track).toHaveBeenCalledTimes(2);
  });
});
