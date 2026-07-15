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

  try {
    console.log('[createOrder] Request body:', JSON.stringify(body));
    const resp = await apiClient.post<any>(`${BASE}/app/orders`, body);
    const data = resp?.data ?? resp;

    console.log('[createOrder] Success response:', JSON.stringify(data));

    // Check for stock conflict response (API returns stockInfo in success response)
    if (data?.stockInfo && Array.isArray(data.stockInfo) && data.stockInfo.length > 0) {
      console.log('[createOrder] Stock conflict detected in success response:', data.stockInfo);
      return {
        orderId: null,
        raw: resp,
        stockInfo: data.stockInfo,
      };
    }

    // Existing success path
    const orderId = data?._id ?? data?.id ?? data?.orderId ?? null;
    console.log('[createOrder] Order placed successfully. OrderId:', orderId);
    return { orderId: orderId != null ? String(orderId) : null, raw: resp };
  } catch (error: any) {
    console.log('[createOrder] Error caught:', error?.message || error);
    console.log('[createOrder] Full error object:', error);
    console.log('[createOrder] error.response:', error?.response);
    console.log('[createOrder] error.response.data:', error?.response?.data);
    console.log('[createOrder] error.data:', error?.data);

    // API may return 400 with stockInfo for stock conflicts instead of 200
    // Try multiple paths where stockInfo might be
    const errorData = error?.response?.data ?? error?.data ?? error;
    console.log('[createOrder] Checking errorData for stockInfo:', errorData);

    if (errorData?.stockInfo && Array.isArray(errorData.stockInfo) && errorData.stockInfo.length > 0) {
      console.log('[createOrder] Stock conflict detected in error response:', errorData.stockInfo);
      return {
        orderId: null,
        raw: error?.response ?? error,
        stockInfo: errorData.stockInfo,
      };
    }

    // Also check if the entire error response is the stockInfo
    if (error?.stockInfo && Array.isArray(error.stockInfo) && error.stockInfo.length > 0) {
      console.log('[createOrder] Stock conflict detected in error root:', error.stockInfo);
      return {
        orderId: null,
        raw: error,
        stockInfo: error.stockInfo,
      };
    }

    console.log('[createOrder] No stock conflict info found, re-throwing error');
    // Re-throw if not a stock conflict
    throw error;
  }
}
