import { cn, formatMoney } from "@/lib/utils";

type PriceProps = {
  priceCents: number;
  compareAtCents?: number | null;
  className?: string;
  /** Stack the struck-through original above the sale price. */
  stacked?: boolean;
};

/**
 * Sale pricing reads the way it does in the prototype: the original struck
 * through in grey, the live price in sale red. Always tabular numerals.
 */
export function Price({
  priceCents,
  compareAtCents,
  className,
  stacked = false,
}: PriceProps) {
  const onSale = Boolean(compareAtCents && compareAtCents > priceCents);

  return (
    <span
      className={cn(
        // Wraps rather than overflowing: on a two-up mobile grid a card is only
        // ~160px wide, and a sale price is two amounts long.
        "inline-flex flex-wrap items-baseline gap-x-1.5 tabular-nums",
        stacked && "flex-col items-end gap-x-0",
        className,
      )}
    >
      {onSale ? (
        <>
          <span className="whitespace-nowrap font-normal text-grey line-through">
            {formatMoney(compareAtCents!)}
          </span>
          <span className="whitespace-nowrap font-semibold text-sale">
            {formatMoney(priceCents)}
          </span>
        </>
      ) : (
        <span className="whitespace-nowrap font-semibold">{formatMoney(priceCents)}</span>
      )}
    </span>
  );
}
