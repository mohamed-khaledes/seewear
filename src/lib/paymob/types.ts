/** Shapes we actually read from Paymob. Anything else stays in `raw`. */

export type PaymobBillingData = {
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  street: string;
  building: string;
  floor: string;
  apartment: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
  shipping_method?: string;
};

export type PaymobIntentionItem = {
  name: string;
  amount: number;
  description: string;
  quantity: number;
};

export type CreateIntentionInput = {
  /** Piastres. */
  amountCents: number;
  currency: string;
  items: PaymobIntentionItem[];
  billingData: PaymobBillingData;
  customer: { first_name: string; last_name: string; email: string };
  /** Our order number — comes back on the callback. */
  specialReference: string;
  notificationUrl: string;
  redirectionUrl: string;
};

export type PaymobIntentionResponse = {
  id: string | number;
  client_secret: string;
  intention_order_id?: number | string | null;
  payment_keys?: { key: string; integration: number; order_id?: number | string }[];
  [key: string]: unknown;
};

export type CreatedIntention = {
  clientSecret: string;
  checkoutUrl: string;
  paymobOrderId: string | null;
  intentionId: string;
  raw: PaymobIntentionResponse;
};

export type PaymobSourceData = {
  pan?: string | null;
  sub_type?: string | null;
  type?: string | null;
};

export type PaymobTransaction = {
  id: number | string;
  amount_cents: number | string;
  created_at: string;
  currency: string;
  error_occured: boolean;
  has_parent_transaction: boolean;
  integration_id: number | string;
  is_3d_secure: boolean;
  is_auth: boolean;
  is_capture: boolean;
  is_refunded: boolean;
  is_standalone_payment: boolean;
  is_voided: boolean;
  owner: number | string;
  pending: boolean;
  success: boolean;
  order: {
    id: number | string;
    merchant_order_id?: string | null;
    [key: string]: unknown;
  };
  source_data?: PaymobSourceData;
  data?: { message?: string; txn_response_code?: string; [key: string]: unknown };
  [key: string]: unknown;
};

export type PaymobCallbackBody = {
  type?: string;
  obj?: PaymobTransaction;
  hmac?: string;
  [key: string]: unknown;
};

/** `POST /api/auth/tokens` — the legacy API key exchanged for a 60-minute token. */
export type PaymobAuthTokenResponse = { token?: string; [key: string]: unknown };
