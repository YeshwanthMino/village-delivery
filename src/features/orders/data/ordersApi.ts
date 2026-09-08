// src/features/orders/data/ordersApi.ts
//
// Fetches the signed-in user's orders. Like the other authed village endpoints,
// /app/orders requires the active store's `x-store-id` header (read from the
// persisted serviceable village) plus the auth token (added by apiClient).
//
// The exact response JSON is undocumented, so mapOrder() is deliberately
// tolerant (mirrors the address mapper / appAuthApi): it accepts common field
// names and logs the raw payload once so the real shape can be confirmed.

import { apiClient } from '@/src/base/services/remote/apiClient';
import { WebService } from '@/src/base/constants/AppConstants';
import { toUnits as toRupeeUnits } from '@/src/shared/utils/currency';
import { Order, OrderItem, OrderStatus, Bill } from '@/src/base/types/village.types';
import { logger } from '@/src/base/services/logger';
import { deriveMinOrderFields } from '@/src/features/cart/domain/bill';

const BASE = WebService.villageBaseURL;

// The API sends real rupees; the app carries prices in internal units. Convert
// on the way in — see shared/utils/currency for the convention.

// The active store's `x-store-id` header is injected centrally by apiClient.

/**
 * Pick the first defined value among candidate keys on an object of unknown
 * shape. The orders response is undocumented (see module comment) and has been
 * observed under several different field names for the same concept, so this
 * stays intentionally loose rather than declaring one shape and being wrong.
 */
function pick(obj: unknown, keys: string[]): unknown {
  if (!obj || typeof obj !== 'object') return undefined;
  const record = obj as Record<string, unknown>;
  for (const k of keys) {
    if (record[k] !== undefined && record[k] !== null) return record[k];
  }
  return undefined;
}

function toUnits(rupeeAmount: unknown): number {
  const n = Number(rupeeAmount);
  return Number.isFinite(n) ? toRupeeUnits(n) : 0;
}

const STATUS_MAP: Record<string, OrderStatus> = {
  pending: 'placed', placed: 'placed', created: 'placed', new: 'placed', open: 'placed',
  confirmed: 'confirmed', accepted: 'confirmed', processing: 'confirmed', preparing: 'confirmed', packed: 'confirmed',
  outfordelivery: 'out_for_delivery', shipped: 'out_for_delivery', dispatched: 'out_for_delivery', ontheway: 'out_for_delivery', delivering: 'out_for_delivery',
  delivered: 'delivered', completed: 'delivered', complete: 'delivered', fulfilled: 'delivered',
  cancelled: 'cancelled', canceled: 'cancelled', rejected: 'cancelled', failed: 'cancelled', returned: 'cancelled',
};

function mapStatus(raw: unknown): OrderStatus {
  const key = String(raw ?? '').toLowerCase().replace(/[^a-z]/g, '');
  return STATUS_MAP[key] ?? 'placed';
}

function mapPaymentMethod(raw: unknown): 'cod' | 'upi' {
  const key = String(raw ?? '').toLowerCase();
  return key.includes('upi') || key.includes('online') || key.includes('prepaid') ? 'upi' : 'cod';
}

function mapAddress(raw: unknown): string {
  if (!raw) return '';
  if (typeof raw === 'string') return raw;
  const parts = [
    pick(raw, ['addressLine', 'addressLine1', 'line1', 'flat', 'house']),
    pick(raw, ['addressLine2', 'line2', 'area', 'street']),
    pick(raw, ['landmark']),
    pick(raw, ['villageName', 'village', 'city', 'town']),
    pick(raw, ['pincode', 'zip', 'postalCode']),
  ].filter((p) => p != null && String(p).trim() !== '');
  return parts.map(String).join(', ');
}

function mapItem(raw: unknown): OrderItem {
  const productRaw = pick(raw, ['product']);
  const product = productRaw && typeof productRaw === 'object' ? productRaw : {};
  const productId = String(pick(raw, ['productId', 'product']) ?? pick(product, ['_id', 'id']) ?? '');
  const name = String(pick(raw, ['name', 'title']) ?? pick(product, ['title', 'name']) ?? 'Item');
  const nameTE = String(pick(raw, ['nameTE', 'titleTE']) ?? pick(product, ['titleTE', 'nameTE']) ?? name);
  const quantity = Number(pick(raw, ['quantity', 'qty', 'count']) ?? 1) || 1;
  const price = toUnits(pick(raw, ['price', 'sellingPrice', 'unitPrice']) ?? pick(product, ['price', 'sellingPrice']) ?? 0);
  const mrpRaw = pick(raw, ['mrp']) ?? pick(product, ['mrp']);
  const mrp = mrpRaw != null ? toUnits(mrpRaw) : price;
  const weight = String(pick(raw, ['weight', 'unit', 'quantityLabel']) ?? pick(product, ['weight', 'unit', 'quantityLabel']) ?? '');
  const emoji = String(pick(raw, ['emoji']) ?? pick(product, ['emoji']) ?? '🛒');
  const image = String(
    pick(raw, ['landingImage', 'image', 'imageUrl', 'thumbnail']) ??
    pick(product, ['landingImage', 'image', 'imageUrl', 'thumbnail']) ?? '',
  );
  return { productId, name, nameTE, emoji, image, weight, price, mrp, quantity };
}

function buildBill(items: OrderItem[], orderTotalRupees: unknown): Bill {
  let itemTotal = 0;
  let mrpTotal = 0;
  let totalCount = 0;
  for (const item of items) {
    itemTotal += item.price * item.quantity;
    mrpTotal += item.mrp * item.quantity;
    totalCount += item.quantity;
  }
  const itemDiscount = Math.max(0, mrpTotal - itemTotal);
  const grandTotal = orderTotalRupees != null ? toUnits(orderTotalRupees) : itemTotal;

  const { minOrderValue, belowMinimum, amountToMinimum } = deriveMinOrderFields(grandTotal);

  return {
    itemTotal,
    mrpTotal,
    itemDiscount,
    deliveryFee: 0,
    platformFee: 0,
    couponDiscount: 0,
    vipMembershipFee: 0, // past orders predate the cart's VIP membership add-on
    grandTotal,
    totalSavings: itemDiscount,
    totalCount,
    minOrderValue,
    belowMinimum,
    amountToMinimum,
  };
}

export function mapOrder(raw: unknown): Order | null {
  if (!raw || typeof raw !== 'object') return null;
  const node = pick(raw, ['data']) ?? raw;

  const id = String(pick(node, ['_id', 'id', 'orderId']) ?? '');
  if (!id) return null;

  const itemsRaw = pick(node, ['products', 'items', 'orderItems', 'lineItems']);
  const items = Array.isArray(itemsRaw) ? itemsRaw.map(mapItem) : [];

  const placedAt =
    pick(node, ['createdAt', 'placedAt', 'placedOn', 'orderedAt', 'scheduledOn']) ?? new Date().toISOString();

  return {
    id,
    placedAt: String(placedAt),
    status: mapStatus(pick(node, ['status', 'orderStatus', 'state'])),
    items,
    bill: buildBill(items, pick(node, ['total', 'grandTotal', 'totalAmount', 'amount', 'billAmount', 'payableAmount'])),
    deliveryAddress: mapAddress(pick(node, ['address', 'deliveryAddress'])),
    paymentMethod: mapPaymentMethod(pick(node, ['paymentMethod', 'paymentMode', 'payment'])),
  };
}

export async function listOrders(skip = 0, limit = 24): Promise<Order[]> {
  const resp = await apiClient.get<unknown>(
    `${BASE}/app/orders?sort=_id%3Adesc&skip=${skip}&limit=${limit}`,
  );
  logger.debug('[orders] list raw:', JSON.stringify(resp)?.slice(0, 1000));
  const list = pick(resp, ['data', 'orders', 'results']) ?? resp;
  if (!Array.isArray(list)) return [];
  return list.map(mapOrder).filter((o): o is Order => o !== null);
}

export async function getOrderDetail(id: string): Promise<Order | null> {
  const resp = await apiClient.get<unknown>(`${BASE}/app/orders/${id}`);
  logger.debug('[orders] detail raw:', JSON.stringify(resp)?.slice(0, 1000));
  return mapOrder(pick(resp, ['data']) ?? resp);
}
