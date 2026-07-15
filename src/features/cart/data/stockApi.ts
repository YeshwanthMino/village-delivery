import { apiClient } from '@/src/base/services/remote/apiClient';
import { WebService } from '@/src/base/constants/AppConstants';

const BASE = WebService.villageBaseURL;

export interface CheckStockItem {
  productId: string;
  quantity: number;
}

export interface CheckStockRequest {
  items: CheckStockItem[];
}

export interface StockCheckItem {
  productId: string;
  inStock: boolean;
  availableQuantity?: number;
}

export interface CheckStockResponse {
  items: StockCheckItem[];
}

const STOCK_CHECK_TIMEOUT = 5000; // 5 seconds

export async function checkCartStock(items: CheckStockItem[]): Promise<CheckStockResponse> {
  if (!items || items.length === 0) {
    return { items: [] };
  }

  const body: CheckStockRequest = { items };

  try {
    console.log('[checkCartStock] Request:', JSON.stringify(body));

    const resp = await apiClient.post<any>(`${BASE}/app/orders/check-stock`, body, {
      timeout: STOCK_CHECK_TIMEOUT,
    });

    const data = resp?.data ?? resp;
    console.log('[checkCartStock] Success response:', JSON.stringify(data));

    // Handle both response formats:
    // 1. {items: [...]} format
    // 2. Direct array [...] format
    let itemsArray: StockCheckItem[] = [];

    if (Array.isArray(data)) {
      // Direct array response
      itemsArray = data.map((item) => ({
        productId: item.productId,
        inStock: item.availableStock > 0,
        availableQuantity: item.availableStock,
      }));
    } else if (data?.items && Array.isArray(data.items)) {
      // {items: [...]} response
      itemsArray = data.items;
    } else {
      throw new Error('Invalid stock check response format');
    }

    return { items: itemsArray };
  } catch (error: any) {
    console.error('[checkCartStock] Error:', error?.message || error);

    // Handle timeout gracefully - assume all items are in stock
    if (error?.code === 'ECONNABORTED' || error?.message?.includes('timeout')) {
      console.warn('[checkCartStock] Timeout - assuming all items in stock');
      return {
        items: items.map((item) => ({
          productId: item.productId,
          inStock: true,
          availableQuantity: item.quantity,
        })),
      };
    }

    throw error;
  }
}
