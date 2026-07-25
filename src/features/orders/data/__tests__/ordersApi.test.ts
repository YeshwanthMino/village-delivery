// Characterization tests for mapOrder/listOrders/getOrderDetail, written before
// retyping the module's `any` params to `unknown`. The response shape is
// undocumented (see the module's own header comment) and mapOrder is
// deliberately tolerant of several field-name variants for the same concept —
// these pin that tolerance so the retype can't silently narrow it.

import { apiClient } from '@/src/base/services/remote/apiClient';
import { mapOrder, listOrders, getOrderDetail } from '../ordersApi';
import { rupees } from '@/src/shared/utils/currency';

jest.mock('@/src/base/services/remote/apiClient', () => ({
  apiClient: { get: jest.fn() },
}));

const mockGet = apiClient.get as jest.Mock;

describe('mapOrder', () => {
  test('returns null for a payload with no id', () => {
    expect(mapOrder({})).toBeNull();
    expect(mapOrder(null)).toBeNull();
    expect(mapOrder('not an object')).toBeNull();
  });

  test('unwraps a { data: ... } envelope', () => {
    const order = mapOrder({ data: { _id: 'o1', products: [] } });
    expect(order?.id).toBe('o1');
  });

  test('reads the id from any of _id / id / orderId', () => {
    expect(mapOrder({ id: 'o2', products: [] })?.id).toBe('o2');
    expect(mapOrder({ orderId: 'o3', products: [] })?.id).toBe('o3');
  });

  test('maps items from any of products / items / orderItems / lineItems', () => {
    const line = { productId: 'p1', name: 'Rice', price: 45, quantity: 2 };
    for (const key of ['products', 'items', 'orderItems', 'lineItems']) {
      const order = mapOrder({ _id: 'o1', [key]: [line] });
      expect(order?.items).toHaveLength(1);
      expect(order?.items[0].name).toBe('Rice');
    }
  });

  test('converts item price/mrp from rupees to internal units', () => {
    const order = mapOrder({
      _id: 'o1',
      products: [{ productId: 'p1', name: 'Rice', price: 45, mrp: 50, quantity: 1 }],
    });
    expect(rupees(order!.items[0].price)).toBe('₹45');
    expect(rupees(order!.items[0].mrp)).toBe('₹50');
  });

  test('reads name/price nested under product when absent on the line itself', () => {
    const order = mapOrder({
      _id: 'o1',
      products: [{ product: { _id: 'p1', title: 'Rice', price: 45 }, quantity: 1 }],
    });
    // Pre-existing quirk, not touched by this pass: `pick(raw, ['productId',
    // 'product'])` treats 'product' as a candidate *value* for productId, so
    // when raw.product exists it wins over falling through to product._id, and
    // productId ends up stringified from the object rather than its id.
    expect(order?.items[0].productId).toBe('[object Object]');
    expect(order?.items[0].name).toBe('Rice');
    expect(rupees(order!.items[0].price)).toBe('₹45');
  });

  test('defaults mrp to price when the payload omits it', () => {
    const order = mapOrder({
      _id: 'o1',
      products: [{ productId: 'p1', name: 'Rice', price: 45, quantity: 1 }],
    });
    expect(order?.items[0].mrp).toBe(order?.items[0].price);
  });

  test('builds the bill from the item lines, discount clamped at zero', () => {
    const order = mapOrder({
      _id: 'o1',
      products: [
        { productId: 'p1', name: 'A', price: 40, mrp: 50, quantity: 2 },
        { productId: 'p2', name: 'B', price: 20, mrp: 20, quantity: 1 },
      ],
    });
    // itemTotal = 40*2 + 20*1 = 100; mrpTotal = 50*2 + 20*1 = 120
    expect(rupees(order!.bill.itemTotal)).toBe('₹100');
    expect(rupees(order!.bill.itemDiscount)).toBe('₹20');
    expect(order?.bill.totalCount).toBe(3);
  });

  test('prefers an explicit order-level total over the summed item total', () => {
    const order = mapOrder({
      _id: 'o1',
      total: 999,
      products: [{ productId: 'p1', name: 'A', price: 45, quantity: 1 }],
    });
    expect(rupees(order!.bill.grandTotal)).toBe('₹999');
  });

  test('normalises a variety of status strings to the four known states', () => {
    const statusOf = (status: string) =>
      mapOrder({ _id: 'o1', products: [], status })?.status;
    expect(statusOf('Preparing')).toBe('confirmed');
    expect(statusOf('OUT_FOR_DELIVERY')).toBe('out_for_delivery');
    expect(statusOf('Delivered')).toBe('delivered');
    expect(statusOf('cancelled')).toBe('cancelled');
    expect(statusOf('totally-unknown-status')).toBe('placed');
  });

  test('maps a payment method mentioning upi/online/prepaid to upi, else cod', () => {
    const methodOf = (paymentMethod: string) =>
      mapOrder({ _id: 'o1', products: [], paymentMethod })?.paymentMethod;
    expect(methodOf('UPI')).toBe('upi');
    expect(methodOf('online')).toBe('upi');
    expect(methodOf('Cash on Delivery')).toBe('cod');
  });

  test('joins the delivery address from its component fields', () => {
    const order = mapOrder({
      _id: 'o1',
      products: [],
      address: { addressLine1: '12 MG Road', villageName: 'Kondapur', pincode: '500084' },
    });
    expect(order?.deliveryAddress).toBe('12 MG Road, Kondapur, 500084');
  });
});

describe('listOrders / getOrderDetail', () => {
  beforeEach(() => jest.clearAllMocks());

  test('unwraps a { data: [...] } list envelope', async () => {
    mockGet.mockResolvedValue({ data: [{ _id: 'o1', products: [] }] });
    const orders = await listOrders();
    expect(orders).toHaveLength(1);
    expect(orders[0].id).toBe('o1');
  });

  test('drops entries that fail to map rather than throwing', async () => {
    mockGet.mockResolvedValue({ data: [{ _id: 'o1', products: [] }, {}] });
    const orders = await listOrders();
    expect(orders).toHaveLength(1);
  });

  test('returns an empty list when the response is not an array', async () => {
    mockGet.mockResolvedValue({ data: 'not a list' });
    expect(await listOrders()).toEqual([]);
  });

  test('getOrderDetail unwraps a { data: {...} } envelope', async () => {
    mockGet.mockResolvedValue({ data: { _id: 'o1', products: [] } });
    const order = await getOrderDetail('o1');
    expect(order?.id).toBe('o1');
  });
});
