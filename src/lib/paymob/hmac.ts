import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { paymobHmacSecret } from "./config";
import type { PaymobTransaction } from "./types";

/**
 * The exact field order Paymob concatenates for a transaction callback HMAC.
 * Verified against Paymob's HMAC calculation docs — values are concatenated with
 * no separator and hashed with HMAC-SHA512 using the merchant HMAC secret.
 */
const TRANSACTION_HMAC_FIELDS = [
  "amount_cents",
  "created_at",
  "currency",
  "error_occured",
  "has_parent_transaction",
  "id",
  "integration_id",
  "is_3d_secure",
  "is_auth",
  "is_capture",
  "is_refunded",
  "is_standalone_payment",
  "is_voided",
  "order.id",
  "owner",
  "pending",
  "source_data.pan",
  "source_data.sub_type",
  "source_data.type",
  "success",
] as const;

function readPath(source: unknown, path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>(
      (value, key) =>
        value && typeof value === "object"
          ? (value as Record<string, unknown>)[key]
          : undefined,
      source,
    );
}

/** Paymob stringifies booleans lowercase and treats null/undefined as empty. */
function stringify(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}

export function buildTransactionHmacPayload(transaction: PaymobTransaction): string {
  return TRANSACTION_HMAC_FIELDS.map((field) =>
    stringify(readPath(transaction, field)),
  ).join("");
}

export function calculateTransactionHmac(transaction: PaymobTransaction): string {
  return createHmac("sha512", paymobHmacSecret())
    .update(buildTransactionHmacPayload(transaction), "utf8")
    .digest("hex");
}

/**
 * Constant-time comparison of the callback's HMAC against ours. A callback that
 * fails this is never allowed to change an order.
 */
export function verifyTransactionHmac(
  transaction: PaymobTransaction,
  receivedHmac: string | null | undefined,
): boolean {
  if (!receivedHmac) return false;

  const expected = calculateTransactionHmac(transaction);
  const received = receivedHmac.trim().toLowerCase();

  if (expected.length !== received.length) return false;

  return timingSafeEqual(Buffer.from(expected, "utf8"), Buffer.from(received, "utf8"));
}
