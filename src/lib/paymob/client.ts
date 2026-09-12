import "server-only";

import {
  PAYMOB_API_BASE,
  paymobPaymentMethods,
  paymobSecretKey,
  unifiedCheckoutUrl,
} from "./config";
import type {
  CreateIntentionInput,
  CreatedIntention,
  PaymobIntentionResponse,
} from "./types";

export class PaymobError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly body?: unknown,
  ) {
    super(message);
    this.name = "PaymobError";
  }
}

async function paymobFetch<T>(
  path: string,
  init: RequestInit & { body?: string },
): Promise<T> {
  const response = await fetch(new URL(path, PAYMOB_API_BASE), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Token ${paymobSecretKey()}`,
      ...init.headers,
    },
    cache: "no-store",
  });

  const text = await response.text();
  let parsed: unknown;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }

  if (!response.ok) {
    throw new PaymobError(
      `Paymob ${path} responded ${response.status}`,
      response.status,
      parsed,
    );
  }

  return parsed as T;
}

/**
 * Creates a payment intention and returns the Unified Checkout URL to send the
 * customer to. Amounts are piastres, exactly as they are stored.
 */
export async function createIntention(
  input: CreateIntentionInput,
): Promise<CreatedIntention> {
  const body = {
    amount: input.amountCents,
    currency: input.currency,
    payment_methods: paymobPaymentMethods(),
    items: input.items,
    billing_data: input.billingData,
    customer: input.customer,
    special_reference: input.specialReference,
    notification_url: input.notificationUrl,
    redirection_url: input.redirectionUrl,
    extras: { order_number: input.specialReference },
  };

  const response = await paymobFetch<PaymobIntentionResponse>("/v1/intention/", {
    method: "POST",
    body: JSON.stringify(body),
  });

  if (!response?.client_secret) {
    throw new PaymobError("Paymob did not return a client secret", 502, response);
  }

  const paymobOrderId =
    response.intention_order_id ?? response.payment_keys?.[0]?.order_id ?? null;

  return {
    clientSecret: response.client_secret,
    checkoutUrl: unifiedCheckoutUrl(response.client_secret),
    paymobOrderId: paymobOrderId === null ? null : String(paymobOrderId),
    intentionId: String(response.id),
    raw: response,
  };
}

/**
 * Refunds a captured transaction. Amount is in piastres; omit it to refund in
 * full. Guarded for demo accounts at the call site.
 */
export async function refundTransaction(
  transactionId: string,
  amountCents: number,
): Promise<unknown> {
  return paymobFetch("/api/acceptance/void_refund/refund", {
    method: "POST",
    body: JSON.stringify({
      transaction_id: transactionId,
      amount_cents: amountCents,
    }),
  });
}
