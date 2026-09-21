import "server-only";

import { PAYMOB_API_BASE } from "./config";
import { PaymobError } from "./client";
import type { PaymobAuthTokenResponse, PaymobTransaction } from "./types";

/**
 * Asking Paymob directly what happened to an order.
 *
 * This is the path for when the webhook never arrived. It is trustworthy
 * without an HMAC for the same reason any API response is: we opened a TLS
 * connection to Paymob with our own credentials and Paymob answered. The
 * callback needs an HMAC precisely because it arrives unasked.
 *
 * Endpoints are from Paymob's published Transaction Inquiry collection
 * (github.com/PaymobAccept/API-Postman-Collections): an API key is exchanged
 * at /api/auth/tokens for a bearer token, which /api/ecommerce/orders/
 * transaction_inquiry accepts alongside our own order number as
 * `merchant_order_id` — the `special_reference` we sent with the intention.
 */

export function isInquiryConfigured(): boolean {
  return Boolean(process.env.PAYMOB_API_KEY);
}

let cachedToken: { value: string; expiresAt: number } | null = null;

async function authToken(): Promise<string> {
  // Paymob issues these for an hour; refresh well before that.
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.value;

  const apiKey = process.env.PAYMOB_API_KEY;
  if (!apiKey) throw new Error("PAYMOB_API_KEY is not set");

  const response = await fetch(new URL("/api/auth/tokens", PAYMOB_API_BASE), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: apiKey }),
    cache: "no-store",
  });

  const body = (await response.json().catch(() => null)) as PaymobAuthTokenResponse | null;
  if (!response.ok || !body?.token) {
    throw new PaymobError("Paymob refused the API key", response.status, body);
  }

  cachedToken = { value: body.token, expiresAt: Date.now() + 50 * 60 * 1000 };
  return body.token;
}

/**
 * The latest transaction Paymob holds for one of our orders, or null when
 * Paymob has never seen a payment attempt for it — which is the usual case for
 * a checkout the shopper simply walked away from.
 */
export async function inquireByOrderNumber(
  orderNumber: string,
): Promise<PaymobTransaction | null> {
  const response = await fetch(
    new URL("/api/ecommerce/orders/transaction_inquiry", PAYMOB_API_BASE),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${await authToken()}`,
      },
      body: JSON.stringify({ merchant_order_id: orderNumber }),
      cache: "no-store",
    },
  );

  if (response.status === 404) return null;

  const body = (await response.json().catch(() => null)) as
    | (PaymobTransaction & { detail?: string })
    | null;

  if (!response.ok) {
    // Paymob answers an order it never saw with a 4xx and a `detail` message.
    if (response.status < 500 && body?.detail) return null;
    throw new PaymobError(`Paymob inquiry responded ${response.status}`, response.status, body);
  }

  if (!body || body.id === undefined || body.id === null) return null;
  return body;
}
