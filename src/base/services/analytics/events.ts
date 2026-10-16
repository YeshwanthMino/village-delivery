/**
 * Provider-independent events used by the customer app. Keep this vocabulary
 * stable when changing analytics vendors. Values are intentionally limited to
 * product, catalog, and transaction signals; never add contact details,
 * coordinates, full addresses, or the raw search query here.
 */
export interface AnalyticsEventProperties {
  app_screen_view: { screen_name: string };
  product_viewed: {
    product_id: string;
    variant_id?: string;
    category_id?: string;
    source?: string;
    list_id?: string;
    position?: number;
    recommendation_id?: string;
    model_version?: string;
    price?: number;
  };
  product_list_viewed: {
    list_id: string;
    item_count?: number;
    category_id?: string;
  };
  recommendation_served: {
    parent_product_id: string;
    list_id: string;
    item_count: number;
    recommendation_id?: string;
    model_version?: string;
  };
  product_impression: {
    product_id: string;
    list_id: string;
    source: string;
    position: number;
    recommendation_id?: string;
    model_version?: string;
  };
  search_performed: {
    query_length: number;
    result_count?: number;
    category_id?: string;
    search_scope?: 'catalog' | 'top_picks';
  };
  product_sort_changed: { list_id: string; sort_key: string };
  category_viewed: { category_id: string; source?: string };
  banner_selected: { banner_id: string; target_type?: string; target_id?: string };
  category_selected: { category_id: string; section_id?: string };
  product_selected: { product_id: string; source?: string; list_id?: string; position?: number; recommendation_id?: string; model_version?: string };
  product_variant_selected: { product_id: string; variant_id: string };
  cart_item_added: {
    product_id: string;
    variant_id?: string;
    quantity?: number;
    cart_quantity?: number;
    unit_price?: number;
    source?: string;
    list_id?: string;
    position?: number;
    recommendation_id?: string;
    model_version?: string;
  };
  cart_item_removed: {
    product_id: string;
    variant_id?: string;
    quantity?: number;
    cart_quantity?: number;
    unit_price?: number;
  };
  cart_quantity_changed: {
    product_id: string;
    variant_id?: string;
    quantity_before: number;
    quantity_after: number;
  };
  favorite_changed: { product_id: string; is_favorite: boolean };
  checkout_started: {
    item_count: number;
    cart_value?: number;
    currency?: string;
    payment_method?: string;
  };
  checkout_blocked: { reason: string };
  payment_method_selected: { payment_method: 'cod' | 'upi' };
  wallet_application_changed: { applied: boolean };
  order_placed: {
    order_id: string;
    item_count?: number;
    value?: number;
    currency?: string;
    payment_method?: string;
  };
  product_purchased: {
    order_id: string;
    product_id: string;
    variant_id?: string;
    quantity: number;
    source?: string;
    list_id?: string;
    position?: number;
    recommendation_id?: string;
    model_version?: string;
  };
  order_outcome_observed: { order_id: string; status: 'delivered' | 'cancelled' | 'refunded'; item_count: number };
  product_outcome_observed: { order_id: string; product_id: string; quantity: number; status: 'delivered' | 'cancelled' | 'refunded' };
  login_completed: { method?: 'otp' | 'restored' };
  signup_completed: { method?: 'otp' };
  logout_completed: { reason?: 'user' | 'session_expired' };
  orders_viewed: { order_count?: number };
  order_detail_viewed: { order_id: string; status?: string };
  order_help_selected: { order_id: string };
  location_selected: {
    village_id: string;
    store_id?: string;
    method: 'auto_gps' | 'gps' | 'search' | 'recent' | 'saved_address' | 'map';
  };
  address_selected: { source?: string; village_id?: string; tag?: 'home' | 'work' | 'other' };
  address_saved: { tag: 'home' | 'work' | 'other'; operation: 'create' | 'edit' };
  address_deleted: { tag: 'home' | 'work' | 'other' };
  village_selected: { village_id: string; source?: string };
  reorder_started: { order_id: string; item_count?: number };
  vip_membership_viewed: { is_vip: boolean };
  vip_membership_selected: { action: 'added' | 'removed' | 'viewed' };
}

export type AnalyticsEventName = keyof AnalyticsEventProperties;
export type AnalyticsEventValue = string | number | boolean;

/** Catalog placement carried from a card through the cart to checkout. */
export interface AnalyticsProductContext {
  source?: string;
  list_id?: string;
  position?: number;
  recommendation_id?: string;
  model_version?: string;
}

/**
 * This allowlist is also applied at runtime. Passing a wider object from a
 * backend cannot accidentally send a phone number or address to the provider.
 */
export const EVENT_PROPERTY_KEYS: {
  [Name in AnalyticsEventName]: readonly (keyof AnalyticsEventProperties[Name])[];
} = {
  app_screen_view: ['screen_name'],
  product_viewed: ['product_id', 'variant_id', 'category_id', 'source', 'list_id', 'position', 'recommendation_id', 'model_version', 'price'],
  product_list_viewed: ['list_id', 'item_count', 'category_id'],
  recommendation_served: ['parent_product_id', 'list_id', 'item_count', 'recommendation_id', 'model_version'],
  product_impression: ['product_id', 'list_id', 'source', 'position', 'recommendation_id', 'model_version'],
  search_performed: ['query_length', 'result_count', 'category_id', 'search_scope'],
  product_sort_changed: ['list_id', 'sort_key'],
  category_viewed: ['category_id', 'source'],
  banner_selected: ['banner_id', 'target_type', 'target_id'],
  category_selected: ['category_id', 'section_id'],
  product_selected: ['product_id', 'source', 'list_id', 'position', 'recommendation_id', 'model_version'],
  product_variant_selected: ['product_id', 'variant_id'],
  cart_item_added: ['product_id', 'variant_id', 'quantity', 'cart_quantity', 'unit_price', 'source', 'list_id', 'position', 'recommendation_id', 'model_version'],
  cart_item_removed: ['product_id', 'variant_id', 'quantity', 'cart_quantity', 'unit_price'],
  cart_quantity_changed: ['product_id', 'variant_id', 'quantity_before', 'quantity_after'],
  favorite_changed: ['product_id', 'is_favorite'],
  checkout_started: ['item_count', 'cart_value', 'currency', 'payment_method'],
  checkout_blocked: ['reason'],
  payment_method_selected: ['payment_method'],
  wallet_application_changed: ['applied'],
  order_placed: ['order_id', 'item_count', 'value', 'currency', 'payment_method'],
  product_purchased: ['order_id', 'product_id', 'variant_id', 'quantity', 'source', 'list_id', 'position', 'recommendation_id', 'model_version'],
  order_outcome_observed: ['order_id', 'status', 'item_count'],
  product_outcome_observed: ['order_id', 'product_id', 'quantity', 'status'],
  login_completed: ['method'],
  signup_completed: ['method'],
  logout_completed: ['reason'],
  orders_viewed: ['order_count'],
  order_detail_viewed: ['order_id', 'status'],
  order_help_selected: ['order_id'],
  location_selected: ['village_id', 'store_id', 'method'],
  address_selected: ['source', 'village_id', 'tag'],
  address_saved: ['tag', 'operation'],
  address_deleted: ['tag'],
  village_selected: ['village_id', 'source'],
  reorder_started: ['order_id', 'item_count'],
  vip_membership_viewed: ['is_vip'],
  vip_membership_selected: ['action'],
};

export interface AnalyticsUserProperties {
  locale?: string | null;
  is_vip?: boolean | null;
  village_id?: string | null;
  store_id?: string | null;
}

export const USER_PROPERTY_KEYS: readonly (keyof AnalyticsUserProperties)[] = [
  'locale',
  'is_vip',
  'village_id',
  'store_id',
];
