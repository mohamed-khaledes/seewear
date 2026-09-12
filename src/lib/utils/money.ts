import { CURRENCY } from "@/config/constants";

/**
 * Money is stored everywhere as integer piastres (EGP × 100).
 * Never let a float touch a price — format only at the view layer.
 */
export function toPiastres(amount: number): number {
  return Math.round(amount * 100);
}

export function toEgp(cents: number): number {
  return cents / 100;
}

const formatters = new Map<string, Intl.NumberFormat>();

function getFormatter(locale: string, fractionDigits: number) {
  const key = `${locale}:${fractionDigits}`;
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, {
      style: "currency",
      currency: CURRENCY,
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    });
    formatters.set(key, formatter);
  }
  return formatter;
}

export type FormatMoneyOptions = {
  locale?: string;
  /** Hide ".00" on whole amounts. Defaults to true. */
  compactZeros?: boolean;
};

/** Format integer piastres as EGP, e.g. 12_500 → "EGP 125". */
export function formatMoney(
  cents: number,
  { locale = "en-EG", compactZeros = true }: FormatMoneyOptions = {},
): string {
  const whole = cents % 100 === 0;
  return getFormatter(locale, compactZeros && whole ? 0 : 2).format(toEgp(cents));
}

/** Percentage saved between a compare-at price and the live price. */
export function discountPercent(
  priceCents: number,
  compareAtCents: number | null | undefined,
): number | null {
  if (!compareAtCents || compareAtCents <= priceCents) return null;
  return Math.round(((compareAtCents - priceCents) / compareAtCents) * 100);
}
