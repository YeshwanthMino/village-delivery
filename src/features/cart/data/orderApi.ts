// src/features/cart/data/orderApi.ts
//
// Places a customer order. Like the other authed village endpoints, /app/orders
// requires the active store's `x-store-id` header (read from the persisted
// serviceable village) plus the auth token (added by apiClient).

import { apiClient } from '@/src/base/services/remote/apiClient';
import { WebService } from '@/src/base/constants/AppConstants';

const BASE = WebService.villageBaseURL;

// The active store's `x-store-id` header is injected centrally by apiClient.

export interface StockInfo {
  productId: string;
  availableStock: number;
}

export interface OrderProductInput {
  productId: string;
  quantity: number;
  hasFreeItem?: boolean;
}

export interface CreateOrderInput {
  products: OrderProductInput[];
  /** Saved address id (the server `_id` carried as Address.id). */
  address: string;
  /** How the customer pays. The server requires the payment flags below. */
  paymentMethod: 'cod' | 'upi';
  scheduledOn?: string;
  notes?: string;
  isPriority?: boolean;
}

export interface CreateOrderResult {
  /** Server order id, when the response carries one. */
  orderId: string | null;
  raw: any;
  /** Stock conflicts returned by server instead of error. */
  stockInfo?: StockInfo[];
}

export async function createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
  const body = {
    products: input.products.map((p) => ({
      productId: p.productId,
      quantity: p.quantity,
      hasFreeItem: p.hasFreeItem ?? false,
    })),
    address: input.address,
    preferredPaymentMethod: input.paymentMethod,
    scheduledOn: input.scheduledOn,
    notes: input.notes,
    isPriority: input.isPriority ?? false,
  };

  const resp = await apiClient.post<any>(`${BASE}/app/orders`, body);
  const data = resp?.data ?? resp;

  // Check for stock conflict response (API returns stockInfo instead of success/error)
  if (data?.stockInfo && Array.isArray(data.stockInfo) && data.stockInfo.length > 0) {
    return {
      orderId: null,
      raw: resp,
      stockInfo: data.stockInfo,
    };
  }

  // Existing success path
  const orderId = data?._id ?? data?.id ?? data?.orderId ?? null;
  return { orderId: orderId != null ? String(orderId) : null, raw: resp };
}
