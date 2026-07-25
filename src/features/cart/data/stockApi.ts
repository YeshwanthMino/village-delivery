import { apiClient } from '@/src/base/services/remote/apiClient';
import { WebService } from '@/src/base/constants/AppConstants';

const BASE = WebService.villageBaseURL;

export interface CheckStockItem {
  productId: string;
  variantId?: string;
  quantity: number;
}

export interface CheckStockRequest {
  items: CheckStockItem[];
}

export interface StockCheckItem {
  productId: string;
  variantId?: string;
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

  // Backend requires both productId and variantId for stock checks
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
        variantId: item.variantId,
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
    // apiClient rejects with a NetworkError ({ type, message }) — never an Axios
    // error — so match on the mapped type. Matching on `code`/message substrings
    // silently never fired.
    if (error?.type === 'REQUEST_TIMED_OUT') {
      // Deliberately fail open. This check is a pre-checkout courtesy; the server
      // re-validates stock when the order is created and returns `stockInfo`
      // conflicts, so a slow check must not block a customer from trying.
      return {
        items: items.map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
          inStock: true,
          availableQuantity: item.quantity,
        })),
      };
    }

    throw error;
  }
}
