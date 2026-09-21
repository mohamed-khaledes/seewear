import { createHmac } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";

import type { PaymobTransaction } from "@/lib/paymob/types";

const SECRET = "test-hmac-secret";

// A callback as Paymob sends it. The fields that feed the HMAC are set to
// values that exercise every rule: booleans, nested paths, a null pan.
const transaction = {
  id: 192036465,
  amount_cents: 122000,
  created_at: "2026-09-18T10:21:04.215396",
  currency: "EGP",
  error_occured: false,
  has_parent_transaction: false,
  integration_id: 4566,
  is_3d_secure: true,
  is_auth: false,
  is_capture: false,
  is_refunded: false,
  is_standalone_payment: true,
  is_voided: false,
  owner: 302852,
  pending: false,
  success: true,
  order: { id: 217503754, merchant_order_id: "SW-4821" },
  source_data: { pan: "2346", sub_type: "MasterCard", type: "card" },
} as unknown as PaymobTransaction;

/**
 * Paymob's documented order, written out by hand rather than imported, so a
 * change to the field list in the code fails here instead of agreeing with
 * itself.
 */
const EXPECTED_PAYLOAD =
  "122000" + // amount_cents
  "2026-09-18T10:21:04.215396" + // created_at
  "EGP" + // currency
  "false" + // error_occured
  "false" + // has_parent_transaction
  "192036465" + // id
  "4566" + // integration_id
  "true" + // is_3d_secure
  "false" + // is_auth
  "false" + // is_capture
  "false" + // is_refunded
  "true" + // is_standalone_payment
  "false" + // is_voided
  "217503754" + // order.id
  "302852" + // owner
  "false" + // pending
  "2346" + // source_data.pan
  "MasterCard" + // source_data.sub_type
  "card" + // source_data.type
  "true"; // success

const sign = (payload: string) => createHmac("sha512", SECRET).update(payload).digest("hex");

let hmac: typeof import("@/lib/paymob/hmac");

beforeAll(async () => {
  process.env.PAYMOB_HMAC_SECRET = SECRET;
  hmac = await import("@/lib/paymob/hmac");
});

describe("Paymob callback HMAC", () => {
  it("concatenates the fields in Paymob's documented order", () => {
    expect(hmac.buildTransactionHmacPayload(transaction)).toBe(EXPECTED_PAYLOAD);
  });

  it("accepts a genuine signature, in either case", () => {
    const signature = sign(EXPECTED_PAYLOAD);
    expect(hmac.verifyTransactionHmac(transaction, signature)).toBe(true);
    expect(hmac.verifyTransactionHmac(transaction, signature.toUpperCase())).toBe(true);
  });

  it("rejects a callback whose amount was changed after signing", () => {
    const signature = sign(EXPECTED_PAYLOAD);
    const tampered = { ...transaction, amount_cents: 100 } as PaymobTransaction;
    expect(hmac.verifyTransactionHmac(tampered, signature)).toBe(false);
  });

  it("rejects a failed payment dressed up as a success", () => {
    const failed = { ...transaction, success: false } as PaymobTransaction;
    const signatureForFailure = sign(hmac.buildTransactionHmacPayload(failed));
    expect(hmac.verifyTransactionHmac(transaction, signatureForFailure)).toBe(false);
  });

  it("rejects a missing, empty or malformed signature", () => {
    expect(hmac.verifyTransactionHmac(transaction, null)).toBe(false);
    expect(hmac.verifyTransactionHmac(transaction, "")).toBe(false);
    expect(hmac.verifyTransactionHmac(transaction, "abc")).toBe(false);
  });

  it("treats a missing nested value as empty, as Paymob does", () => {
    const wallet = { ...transaction, source_data: { type: "wallet" } } as PaymobTransaction;
    expect(hmac.buildTransactionHmacPayload(wallet)).toContain("217503754302852false" + "wallet");
  });
});
