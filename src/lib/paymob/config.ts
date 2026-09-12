import "server-only";

/**
 * Paymob runs one API host per region. This store is Egypt/EGP, so the default
 * is the Egyptian host; override with PAYMOB_API_BASE for KSA, UAE, Oman or PK.
 */
export const PAYMOB_API_BASE =
  process.env.PAYMOB_API_BASE ?? "https://accept.paymob.com";

export function paymobSecretKey(): string {
  const key = process.env.PAYMOB_SECRET_KEY;
  if (!key) throw new Error("PAYMOB_SECRET_KEY is not set");
  return key;
}

export function paymobPublicKey(): string {
  const key = process.env.PAYMOB_PUBLIC_KEY;
  if (!key) throw new Error("PAYMOB_PUBLIC_KEY is not set");
  return key;
}

export function paymobHmacSecret(): string {
  const secret = process.env.PAYMOB_HMAC_SECRET;
  if (!secret) throw new Error("PAYMOB_HMAC_SECRET is not set");
  return secret;
}

/** Card integration id, plus the wallet one when it is configured. */
export function paymobPaymentMethods(): number[] {
  const ids = [
    process.env.PAYMOB_INTEGRATION_ID_CARD,
    process.env.PAYMOB_INTEGRATION_ID_WALLET,
  ]
    .filter((value): value is string => Boolean(value))
    .map((value) => Number.parseInt(value, 10))
    .filter((value) => Number.isFinite(value));

  if (ids.length === 0) {
    throw new Error("PAYMOB_INTEGRATION_ID_CARD is not set");
  }

  return ids;
}

/** True when Paymob is wired up enough to take a payment. */
export function isPaymobConfigured(): boolean {
  return Boolean(
    process.env.PAYMOB_SECRET_KEY &&
      process.env.PAYMOB_PUBLIC_KEY &&
      process.env.PAYMOB_INTEGRATION_ID_CARD &&
      process.env.PAYMOB_HMAC_SECRET,
  );
}

export function unifiedCheckoutUrl(clientSecret: string): string {
  const url = new URL("/unifiedcheckout/", PAYMOB_API_BASE);
  url.searchParams.set("publicKey", paymobPublicKey());
  url.searchParams.set("clientSecret", clientSecret);
  return url.toString();
}
